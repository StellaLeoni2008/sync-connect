import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({
    meta: [
      { title: "Create an event — SYNC" },
      { name: "description", content: "Create a real-world event and let the right people find it nearby." },
      { property: "og:title", content: "Create an event — SYNC" },
      { property: "og:description", content: "Bring the right people together with a SYNC Zone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewEvent,
});

const TYPES = [
  { value: "SOCIAL", label: "Social" },
  { value: "NETWORKING", label: "Networking" },
  { value: "STUDY", label: "Study" },
  { value: "SPORTS", label: "Sports" },
  { value: "HACKATHON", label: "Hackathon" },
  { value: "CONFERENCE", label: "Conference" },
  { value: "CAMPUS", label: "Campus" },
  { value: "OTHER", label: "Other" },
] as const;

function NewEvent() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", venue: "", description: "", type: "SOCIAL", starts: "", ends: "", limit: "", radius: "500" });
  const [isPublic, setPublic] = useState(true);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function create() {
    if (!form.name.trim() || !form.starts || !form.ends) {
      setError("Add a name, a start and an end time.");
      return;
    }
    if (new Date(form.ends) <= new Date(form.starts)) {
      setError("The event must end after it starts.");
      return;
    }
    setBusy(true);
    setError("");
    const limit = form.limit.trim() ? Math.max(2, Number(form.limit)) : null;
    const { data: event, error: createError } = await supabase
      .from("events")
      .insert({
        name: form.name.trim(),
        venue: form.venue.trim(),
        description: form.description.trim(),
        event_type: form.type,
        starts_at: new Date(form.starts).toISOString(),
        ends_at: new Date(form.ends).toISOString(),
        organizer_id: user.id,
        is_public: isPublic,
        discovery_radius_m: Number(form.radius),
        participant_limit: limit,
        status: "ACTIVE",
      })
      .select()
      .single();
    if (createError || !event) {
      setError(createError?.message ?? "Could not create the event.");
      setBusy(false);
      return;
    }
    if (cover) {
      const ext = cover.name.split(".").pop() ?? "jpg";
      const path = `${event.id}/cover.${ext}`;
      const { error: uploadError } = await supabase.storage.from("event-covers").upload(path, cover, { upsert: true });
      if (!uploadError) await supabase.from("events").update({ cover_path: path }).eq("id", event.id);
    }
    await supabase.from("event_participants").insert({ event_id: event.id, user_id: user.id });
    navigate({ to: "/events/$eventId", params: { eventId: event.id } });
  }

  return (
    <AppShell>
      <div className="pb-10 pt-6">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Events
        </Link>
        <h1 className="mt-7 text-3xl font-medium">Create an event</h1>

        <div className="mt-7 space-y-5 rounded-2xl border border-border bg-card p-5">
          <Field label="Event name">
            <Input value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Sunday pickup soccer" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Starts">
              <Input type="datetime-local" value={form.starts} onChange={(e) => set("starts")(e.target.value)} />
            </Field>
            <Field label="Ends">
              <Input type="datetime-local" value={form.ends} onChange={(e) => set("ends")(e.target.value)} />
            </Field>
          </div>
          <Field label="Location">
            <Input value={form.venue} onChange={(e) => set("venue")(e.target.value)} placeholder="Venue or meeting point" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => set("description")(e.target.value)} placeholder="What should people know?" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Type">
              <Select value={form.type} onValueChange={set("type")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Participant limit (optional)">
              <Input inputMode="numeric" value={form.limit} onChange={(e) => set("limit")(e.target.value.replace(/\D/g, ""))} placeholder="No limit" />
            </Field>
          </div>
          <Field label="Discovery radius">
            <Select value={form.radius} onValueChange={set("radius")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 metres</SelectItem>
                <SelectItem value="250">250 metres</SelectItem>
                <SelectItem value="500">500 metres</SelectItem>
                <SelectItem value="1000">1 kilometre</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cover image (optional)">
            <label className="flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              <ImagePlus className="h-4 w-4" />
              {cover ? cover.name : "Choose image"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
            </label>
          </Field>
          <label className="flex items-center justify-between pt-1">
            <span className="text-sm">Anyone nearby can find it</span>
            <Switch checked={isPublic} onCheckedChange={setPublic} />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        <Button size="lg" className="mt-6 w-full" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create event"}</Button>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
