import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, MapPin, UsersRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event details — SYNC" },
      { name: "description", content: "View an event, join it, or manage the one you created." },
      { property: "og:title", content: "Event details — SYNC" },
      { property: "og:description", content: "Meet relevant people at a real-world SYNC event." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventDetail,
});

function EventDetail() {
  const { user } = Route.useRouteContext();
  const { eventId } = Route.useParams();
  const [event, setEvent] = useState<Tables<"events"> | null>(null);
  const [joined, setJoined] = useState(false);
  const [count, setCount] = useState(0);
  const [cover, setCover] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [{ data: row }, { data: participant }, { data: total }] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      supabase.from("event_participants").select("user_id").eq("event_id", eventId).eq("user_id", user.id).maybeSingle(),
      supabase.from("event_participant_counts").select("participant_count").eq("event_id", eventId).maybeSingle(),
    ]);
    setEvent(row ?? null);
    setCount(total?.participant_count ?? 0);
    setJoined(Boolean(participant));
    if (row?.cover_path) {
      const { data } = await supabase.storage.from("event-covers").createSignedUrl(row.cover_path, 900);
      setCover(data?.signedUrl ?? null);
    }
  }, [eventId, user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle() {
    setError("");
    if (joined) {
      await supabase.from("event_participants").delete().eq("event_id", eventId).eq("user_id", user.id);
    } else {
      if (full) {
        setError("This event is full.");
        return;
      }
      const { error: joinError } = await supabase.from("event_participants").insert({ event_id: eventId, user_id: user.id });
      if (joinError) setError("We couldn’t join you to this event.");
    }
    await load();
  }

  async function cancel() {
    if (!event || event.organizer_id !== user.id) return;
    await supabase.from("events").update({ status: "CANCELLED" }).eq("id", eventId);
    await load();
  }

  if (!event) return <AppShell><div className="py-24 text-center text-muted-foreground">Event unavailable.</div></AppShell>;

  const organizer = event.organizer_id === user.id;
  const full = event.participant_limit !== null && count >= event.participant_limit;
  const live = event.status === "ACTIVE";

  return (
    <AppShell>
      <div className="pb-10 pt-6">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Events</Link>
        {cover ? <img src={cover} alt="" className="mt-7 aspect-[16/8] w-full rounded-2xl object-cover" /> : null}
        <p className="mt-8 text-xs uppercase text-signal">{live ? event.event_type.toLowerCase() : "cancelled"}</p>
        <h1 className="mt-3 text-3xl font-medium">{event.name}</h1>

        <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <Info icon={CalendarDays}>{new Date(event.starts_at).toLocaleString()}</Info>
          <Info icon={MapPin}>{event.venue || "Location shared by organizer"}</Info>
          <Info icon={UsersRound}>{count}{event.participant_limit ? ` of ${event.participant_limit}` : ""} joined</Info>
        </div>

        {event.description ? <p className="mt-7 leading-relaxed text-muted-foreground">{event.description}</p> : null}

        {live && !organizer ? (
          <Button className="mt-8 w-full" size="lg" variant={joined ? "outline" : "default"} disabled={!joined && full} onClick={toggle}>
            {joined ? "Leave event" : full ? "Event full" : "Join event"}
          </Button>
        ) : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        {organizer ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase text-muted-foreground">You’re the organizer</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat value={String(count)} label="Joined" />
              <Stat value={`${event.discovery_radius_m}m`} label="Discovery radius" />
            </div>
            {live ? <Button className="mt-4 w-full" variant="outline" onClick={cancel}>Cancel event</Button> : null}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-secondary p-4">
      <p className="text-2xl font-medium">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Info({ icon: Icon, children }: { icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
      <span>{children}</span>
    </div>
  );
}
