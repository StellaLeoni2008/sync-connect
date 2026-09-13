import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Radar } from "@/components/sync/radar";
import { PersonSheet } from "@/components/sync/person-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useProximity, type Fix } from "@/hooks/use-proximity";
import { vibrateSync } from "@/lib/haptics";
import { askForNotifications, notify } from "@/lib/notifications";
import { ensurePushSubscription } from "@/lib/push";
import { DEFAULT_RADIUS_M, RADIUS_OPTIONS_M } from "@/lib/matching";
import {
  getNearbyPeople,
  getSyncRequests,
  requestSync,
  respondToSyncRequest,
  startDiscovery,
  stopSync,
  updatePresence,
  type NearbyPerson,
  type SyncRequest,
} from "@/lib/sync.functions";

export const Route = createFileRoute("/_authenticated/sync")({
  head: () => ({
    meta: [
      { title: "Radar — SYNC" },
      { name: "description", content: "See who is nearby right now and ask to sync in one tap." },
      { property: "og:title", content: "Radar — SYNC" },
      { property: "og:description", content: "Proximity-first discovery. Your exact location always stays private." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SyncRadar,
});

function SyncRadar() {
  const { user } = Route.useRouteContext();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState("");
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS_M);
  const [people, setPeople] = useState<NearbyPerson[] | null>(null);
  const [selected, setSelected] = useState<NearbyPerson | null>(null);
  const [requests, setRequests] = useState<SyncRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [error, setError] = useState("");
  const radiusRef = useRef(radius);
  radiusRef.current = radius;
  const seen = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    const [nearby, inbound] = await Promise.all([getNearbyPeople(), getSyncRequests()]);
    setPeople(nearby.people);
    setActive(nearby.discoveryActive);
    setRequests(inbound);
    const fresh = nearby.people.filter((person) => !seen.current.has(person.userId));
    fresh.forEach((person) => seen.current.add(person.userId));
    const first = fresh[0];
    if (first && nearby.discoveryActive) {
      vibrateSync();
      notify("people-nearby", "Someone is nearby", `${fresh.length === 1 ? first.name : `${fresh.length} people`} nearby right now.`, { cooldown: true });
    }
    const firstRequest = inbound[0];
    if (firstRequest) notify(`request-${firstRequest.matchId}`, "Sync request", `${firstRequest.name} wants to sync with you.`);
  }, []);

  const pushFix = useCallback(
    async (next: Fix) => {
      await updatePresence({ data: { latitude: next.latitude, longitude: next.longitude, accuracy: next.accuracy, radiusMeters: radiusRef.current, discoveryActive: true } });
      await refresh();
    },
    [refresh],
  );

  const { permission, fix, error: locationError, locating, requestFix, watch } = useProximity(pushFix);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("onboarding_complete,discovery_enabled")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data?.onboarding_complete) {
          window.location.href = "/onboarding";
          return;
        }
        if (data.discovery_enabled) await refresh();
        setLoading(false);
      });
  }, [user.id, refresh]);

  // Keep the radar live while discovery is on.
  useEffect(() => {
    if (!active) {
      watch(false);
      return;
    }
    watch(true);
    const channel = supabase
      .channel(`radar:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_candidates" }, () => void refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_responses" }, () => void refresh())
      .subscribe();
    const interval = window.setInterval(() => void refresh(), 20000);
    return () => {
      watch(false);
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, user.id, refresh]);

  async function start() {
    setError("");
    setStarting(true);
    void askForNotifications().then(() => ensurePushSubscription());
    const current = fix && Date.now() - fix.at < 60000 ? fix : await requestFix();
    if (!current) {
      setStarting(false);
      return;
    }
    try {
      await startDiscovery({ data: { status: status.trim() || undefined, location: { latitude: current.latitude, longitude: current.longitude, accuracy: current.accuracy, radiusMeters: radius } } });
      setActive(true);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t start the radar. Try again.");
    } finally {
      setStarting(false);
    }
  }

  async function stop() {
    await stopSync();
    watch(false);
    setActive(false);
    setPeople(null);
    seen.current.clear();
  }

  async function send(person: NearbyPerson) {
    setBusy(true);
    try {
      await requestSync({ data: { userId: person.userId } });
      vibrateSync();
      setSelected(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That request didn’t go through.");
    } finally {
      setBusy(false);
    }
  }

  async function answer(request: SyncRequest, accept: boolean) {
    setBusy(true);
    try {
      const result = await respondToSyncRequest({ data: { matchId: request.matchId, accept } });
      if (accept) {
        vibrateSync();
        if (result.status === "MUTUAL" || result.status === "MET") setCelebrate(request.name);
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const locationBlocked = permission === "denied" || permission === "unsupported";
  const count = people?.length ?? 0;

  return (
    <AppShell>
      <section className="pt-8">
        {requests.length ? (
          <div className="mb-8 space-y-3">
            {requests.map((request) => (
              <div key={request.matchId} className="animate-blip-in rounded-2xl border border-signal/40 bg-card p-4 signal-glow">
                <div className="flex items-center gap-3">
                  {request.photoUrl ? <img src={request.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">{request.name.slice(0, 1)}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{request.name} wants to sync</p>
                    <p className="truncate text-xs text-muted-foreground">{request.distanceLabel}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button size="sm" disabled={busy} onClick={() => answer(request, true)}>Accept</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => answer(request, false)}>Not now</Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {celebrate ? (
          <div className="animate-sync-success mb-8 rounded-2xl border border-signal bg-card p-6 text-center signal-glow">
            <p className="text-xs uppercase tracking-[.18em] text-signal">It’s a SYNC</p>
            <h2 className="mt-3 text-2xl font-medium">You and {celebrate} are connected.</h2>
            <Button asChild className="mt-5"><Link to="/connections">Open connection</Link></Button>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="mx-auto aspect-square w-full max-w-[22rem] rounded-full" />
            <Skeleton className="mx-auto h-12 w-48 rounded-full" />
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-xs uppercase tracking-[.16em] text-signal">{active ? "Radar on" : "Radar off"}</p>
              <h1 className="mt-3 text-3xl font-medium">
                {!active ? "See who’s around you." : count ? `${count} ${count === 1 ? "person" : "people"} nearby` : "Looking around you…"}
              </h1>
            </div>

            <div className="mt-8">
              <Radar people={people ?? []} radiusMeters={radius} active={active} onSelect={setSelected} />
            </div>

            {active ? (
              <>
                <p className="mt-8 text-center text-sm text-muted-foreground">Tap anyone to see their profile and ask to sync.</p>
                <Button className="mx-auto mt-5 block" variant="outline" onClick={stop}>Turn radar off</Button>
              </>
            ) : (
              <div className="mt-8">
                <Input
                  value={status}
                  maxLength={140}
                  onChange={(event) => setStatus(event.target.value)}
                  placeholder="What are you up to? (optional)"
                  aria-label="What are you up to"
                  className="h-13 rounded-full px-5"
                />
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {RADIUS_OPTIONS_M.map((option) => (
                    <button
                      key={option}
                      onClick={() => setRadius(option)}
                      className={`rounded-full border px-4 py-2 text-xs ${radius === option ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
                    >
                      {option >= 1000 ? `${option / 1000} km` : `${option} m`}
                    </button>
                  ))}
                </div>
                <Button size="lg" className="mt-6 w-full" disabled={starting || locating} onClick={start}>
                  {locating ? "Finding you…" : starting ? "Turning on…" : "Turn radar on"}
                </Button>
                {locationBlocked ? <p className="mt-4 text-center text-sm text-muted-foreground">SYNC needs location to find people nearby. Your exact position is never shown to anyone.</p> : null}
              </div>
            )}

            {error || locationError ? <p className="mt-4 text-center text-sm text-destructive">{error || locationError}</p> : null}
          </>
        )}
      </section>
      <PersonSheet person={selected} busy={busy} onClose={() => setSelected(null)} onRequest={send} />
    </AppShell>
  );
}
