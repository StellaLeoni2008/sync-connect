import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Plus, UsersRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/events/")({
  head: () => ({
    meta: [
      { title: "Events — SYNC" },
      { name: "description", content: "Create or join real-world events happening near you." },
      { property: "og:title", content: "Events — SYNC" },
      { property: "og:description", content: "Find the right people in the room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Events,
});

function Events() {
  const { user } = Route.useRouteContext();
  const [events, setEvents] = useState<Tables<"events">[] | null>(null);
  const [joined, setJoined] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const [{ data: all }, { data: mine }, { data: totals }] = await Promise.all([
        supabase.from("events").select("*").gte("ends_at", new Date().toISOString()).eq("status", "ACTIVE").order("starts_at"),
        supabase.from("event_participants").select("event_id").eq("user_id", user.id),
        supabase.from("event_participant_counts").select("event_id,participant_count"),
      ]);
      setEvents(all ?? []);
      setJoined((mine ?? []).map((row) => row.event_id));
      setCounts(Object.fromEntries((totals ?? []).map((row) => [row.event_id, row.participant_count])));
    })();
  }, [user.id]);

  const list = events ?? [];
  const upcoming = list.filter((event) => event.organizer_id !== user.id);
  const yours = list.filter((event) => event.organizer_id === user.id);
  const joinedEvents = useMemo(() => list.filter((event) => joined.includes(event.id)), [list, joined]);

  return (
    <AppShell>
      <div className="pt-10">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-3xl font-medium">Events</h1>
          <Button asChild size="sm"><Link to="/events/new"><Plus />Create event</Link></Button>
        </div>

        {events === null ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-32 rounded-2xl" />)}</div>
        ) : (
          <Tabs defaultValue="upcoming" className="mt-7">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-full">
              <TabsTrigger className="rounded-full py-2" value="upcoming">Nearby</TabsTrigger>
              <TabsTrigger className="rounded-full py-2" value="joined">Joined</TabsTrigger>
              <TabsTrigger className="rounded-full py-2" value="mine">Yours</TabsTrigger>
            </TabsList>
            <EventTab value="upcoming" events={upcoming} counts={counts} />
            <EventTab value="joined" events={joinedEvents} counts={counts} />
            <EventTab value="mine" events={yours} counts={counts} />
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}

function EventTab({ value, events, counts }: { value: string; events: Tables<"events">[]; counts: Record<string, number> }) {
  return (
    <TabsContent value={value} className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {events.map((event) => {
          const count = counts[event.id] ?? 0;
          const full = event.participant_limit !== null && count >= event.participant_limit;
          return (
            <Link key={event.id} to="/events/$eventId" params={{ eventId: event.id }} className="rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-elevated">
              <p className="text-xs uppercase text-signal">{new Date(event.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              <h2 className="mt-3 text-xl">{event.name}</h2>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.venue || "Location TBA"}</span>
                <span className="inline-flex items-center gap-1"><UsersRound className="h-3.5 w-3.5" />{count}{event.participant_limit ? `/${event.participant_limit}` : ""} joined</span>
                {full ? <span className="rounded-full border border-border px-2 py-0.5">Full</span> : null}
              </div>
            </Link>
          );
        })}
      </div>
      {!events.length ? (
        <div className="py-20 text-center text-muted-foreground">
          <CalendarDays className="mx-auto mb-4 h-6 w-6" />
          Nothing here yet.
        </div>
      ) : null}
    </TabsContent>
  );
}
