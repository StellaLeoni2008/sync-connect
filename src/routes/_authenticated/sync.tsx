import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Compass, GraduationCap, HandHelping, Hammer, MapPin, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ProximityField } from "@/components/sync/proximity-field";
import { SyncDebugPanel } from "@/components/dev/sync-debug-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useProximity, type Fix } from "@/hooks/use-proximity";
import { DEFAULT_RADIUS_M, RADIUS_OPTIONS_M } from "@/lib/matching";
import { activateSync, findNearbySyncs, stopSync, updatePresence } from "@/lib/sync.functions";

export const Route = createFileRoute("/_authenticated/sync")({head:()=>({meta:[{title:"Start a SYNC — SYNC"},{name:"description",content:"Share what you want to do and find relevant people nearby."},{property:"og:title",content:"Start a SYNC"},{property:"og:description",content:"Find the right person nearby while keeping your exact location private."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}), component: SyncHome });

const modes = [
  { id: "BUILD", icon: Hammer, desc: "Find the missing skill" },
  { id: "MEET", icon: Users, desc: "Meet someone worth knowing" },
  { id: "LEARN", icon: GraduationCap, desc: "Find someone who can teach" },
  { id: "HELP", icon: HandHelping, desc: "Offer what you know" },
  { id: "EXPLORE", icon: Compass, desc: "Leave room for serendipity" },
  { id: "EVENT", icon: CalendarDays, desc: "Meet within a SYNC Zone" },
] as const;

const LOCATION_COPY = "SYNC uses your location while discovery is active to find relevant people nearby. We never show your exact location to other users.";

function SyncHome() {
  const { user } = Route.useRouteContext();
  const [mode, setMode] = useState<(typeof modes)[number]["id"]>("BUILD");
  const [text, setText] = useState("");
  const [active, setActive] = useState(false);
  const [intent, setIntent] = useState("");
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS_M);
  const [phase, setPhase] = useState<"idle" | "locating" | "searching" | "active">("idle");
  const [nearby, setNearby] = useState<number | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [realtime, setRealtime] = useState("idle");
  const radiusRef = useRef(radius);
  radiusRef.current = radius;

  const pushFix = useCallback(async (next: Fix) => {
    await updatePresence({ data: { latitude: next.latitude, longitude: next.longitude, accuracy: next.accuracy, radiusMeters: radiusRef.current, discoveryActive: true } });
    await findNearbySyncs();
  }, []);

  const { permission, fix, error: locationError, locating, requestFix, watch } = useProximity(pushFix);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("onboarding_complete,discovery_enabled")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.onboarding_complete) window.location.href = "/onboarding";
        else if (data.discovery_enabled) {
          setActive(true);
          setPhase("active");
        }
      });
    supabase
      .from("intents")
      .select("original_text")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setIntent(data?.original_text ?? ""));
  }, [user.id]);

  const refreshMatch = useCallback(async () => {
    const { data } = await supabase
      .from("match_candidates")
      .select("id")
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .in("status", ["PENDING", "WAITING", "MUTUAL"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setMatchId(data?.id ?? null);
  }, [user.id]);

  // Keep presence fresh and re-run the nearby search while discovery is active.
  useEffect(() => {
    if (!active) {
      watch(false);
      setRealtime("idle");
      return;
    }
    watch(true);
    const channel = supabase
      .channel(`sync-home:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_candidates" }, () => {
        void refreshMatch();
      })
      .subscribe((status) => setRealtime(status));
    const interval = window.setInterval(() => {
      void findNearbySyncs().then((result) => {
        setNearby(result.nearbyActiveCount);
        if (result.matchId) setMatchId(result.matchId);
      });
    }, 45000);
    void refreshMatch();
    return () => {
      watch(false);
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, user.id, refreshMatch]);

  async function start() {
    if (text.trim().length < 3) return;
    setError("");
    setPhase("locating");
    const current = fix && Date.now() - fix.at < 60000 ? fix : await requestFix();
    if (!current) {
      setPhase("idle");
      return;
    }
    setPhase("searching");
    try {
      const result = await activateSync({
        data: { text, goal: mode, location: { latitude: current.latitude, longitude: current.longitude, accuracy: current.accuracy, radiusMeters: radius } },
      });
      setIntent(text);
      setNearby(result.nearbyActiveCount);
      setMatchId(result.matchId ?? null);
      setActive(true);
      setPhase("active");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t start SYNC. Try again.");
      setPhase("idle");
    }
  }

  async function stop() {
    await stopSync();
    watch(false);
    setActive(false);
    setPhase("idle");
    setMatchId(null);
  }

  const locationBlocked = permission === "denied" || permission === "unsupported";

  return (
    <AppShell>
      {active ? (
        <section className="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <ProximityField />
          <p className="mt-12 text-xs uppercase tracking-[.16em] text-signal">SYNC ACTIVE</p>
          <h1 className="mt-4 text-3xl font-medium">
            {matchId ? "Someone nearby has what you’re looking for." : "No strong SYNC nearby yet."}
          </h1>
          <p className="mt-5 max-w-xs text-sm text-muted-foreground">{intent}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {nearby === null ? "Looking for people nearby…" : `${nearby} ${nearby === 1 ? "person" : "people"} syncing within ${radius} m`}
          </p>
          {matchId?<Button asChild className="mt-8"><Link to="/match/$matchId" params={{matchId}}>View this SYNC</Link></Button>:<Button asChild className="mt-8"><Link to="/discovery">Open Discovery</Link></Button>}
          <Button className="mt-3" variant="outline" onClick={stop}>
            Stop Syncing
          </Button>
        </section>
      ) : (
        <>
          <p className="mt-10 text-xs uppercase text-muted-foreground">Discovery Off</p>
          <h1 className="mt-4 text-4xl font-medium leading-tight">What are you looking for today?</h1>
          <div className="mt-9 grid grid-cols-2 gap-2">
            {modes.map(({ id, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`min-h-32 rounded-2xl border p-4 text-left ${mode === id ? "border-signal bg-elevated" : "border-border bg-card"}`}
              >
                <Icon className={mode === id ? "h-5 w-5 text-signal" : "h-5 w-5"} strokeWidth={1.5} />
                <span className="mt-5 block text-sm font-medium">{id[0] + id.slice(1).toLowerCase()}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
          <label className="mt-8 block text-sm" htmlFor="intent-text">
            Tell SYNC what you need
          </label>
          <Textarea
            id="intent-text"
            value={text}
            maxLength={1000}
            onChange={(event) => setText(event.target.value)}
            placeholder="I want to learn Python · I want to play soccer · I need a designer"
            className="mt-3 min-h-32 rounded-2xl bg-card p-5"
          />

          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-signal" strokeWidth={1.5} />
              <span className="font-medium">Nearby radius</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {RADIUS_OPTIONS_M.map((option) => (
                <button
                  key={option}
                  onClick={() => setRadius(option)}
                  className={`rounded-full border px-4 py-2 text-xs ${radius === option ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                >
                  {option >= 1000 ? `${option / 1000} km` : `${option} m`}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{LOCATION_COPY}</p>
            {locationBlocked ? (
              <div className="mt-4">
                <p className="text-sm text-red-500">Location is required to find nearby SYNCs.</p>
                <Button className="mt-3" variant="outline" onClick={() => void requestFix()}>
                  Enable Location
                </Button>
              </div>
            ) : null}
          </div>

          {error || locationError ? <p className="mt-4 text-sm text-red-500">{error || locationError}</p> : null}

          <Button size="lg" className="mt-3 w-full" disabled={phase === "locating" || phase === "searching" || locating || text.trim().length < 3} onClick={start}>
            {phase === "locating" || locating ? "Getting your location…" : phase === "searching" ? "Looking for people nearby…" : "START SYNCING"}
          </Button>
        </>
      )}
      <SyncDebugPanel permission={permission} realtime={realtime} />
    </AppShell>
  );
}
