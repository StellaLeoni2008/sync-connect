import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/edit-profile")({
  head: () => ({ meta: [{ title: "Edit your profile — SYNC" }, { name: "description", content: "Update your name, photo, bio, skills and interests so SYNC matches you better." }, { property: "og:title", content: "Edit your profile — SYNC" }, { property: "og:description", content: "Change what SYNC matches you on at any time." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: EditProfile,
});

const goals = ["BUILD", "MEET", "LEARN", "HELP", "EXPLORE"] as const;
const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

function EditProfile() {
  const { user } = Route.useRouteContext();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [goal, setGoal] = useState<string>("BUILD");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [text, setText] = useState({ hobbies: "", interests: "", can_help_with: "", wants_to_learn: "" });
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [{ data: profile }, { data: all }, { data: mine }] = await Promise.all([
        supabase.from("profiles").select("name,bio,primary_context,avatar_path,hobbies,interests,can_help_with,wants_to_learn").eq("id", user.id).maybeSingle(),
        supabase.from("skills").select("id,name").order("name"),
        supabase.from("user_skills").select("skill_id").eq("user_id", user.id),
      ]);
      if (!alive) return;
      setSkills(all ?? []);
      setSelected((mine ?? []).map((row) => row.skill_id));
      if (profile) {
        setName(profile.name ?? "");
        setBio(profile.bio ?? "");
        setGoal(profile.primary_context ?? "BUILD");
        setText({ hobbies: (profile.hobbies ?? []).join(", "), interests: (profile.interests ?? []).join(", "), can_help_with: (profile.can_help_with ?? []).join(", "), wants_to_learn: (profile.wants_to_learn ?? []).join(", ") });
        if (profile.avatar_path) {
          const { data } = await supabase.storage.from("profile-photos").createSignedUrl(profile.avatar_path, 3600);
          if (alive) setPhotoUrl(data?.signedUrl ?? null);
        }
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user.id]);

  async function addCustomSkill() {
    const value = custom.trim();
    if (!value) return;
    let { data } = await supabase.from("skills").select("id,name").eq("normalized_name", value.toLowerCase()).maybeSingle();
    if (!data) {
      const created = await supabase.from("skills").insert({ name: value }).select("id,name").single();
      if (created.error) { setMessage(created.error.message); return; }
      data = created.data;
    }
    if (!data) return;
    setSkills((current) => (current.some((s) => s.id === data.id) ? current : [...current, data].sort((a, b) => a.name.localeCompare(b.name))));
    setSelected((current) => (current.includes(data.id) ? current : [...current, data.id]));
    setCustom("");
  }

  async function save() {
    if (!name.trim()) { setMessage("Add your name to save."); return; }
    setBusy(true); setMessage("");
    let avatar_path: string | null | undefined;
    if (photo) {
      const ext = photo.name.split(".").pop() ?? "jpg";
      avatar_path = `${user.id}/profile.${ext}`;
      const { error } = await supabase.storage.from("profile-photos").upload(avatar_path, photo, { upsert: true });
      if (error) { setMessage(error.message); setBusy(false); return; }
    }
    const { error: profileError } = await supabase.from("profiles").update({
      name: name.trim(), bio: bio.trim(), primary_context: goal,
      hobbies: list(text.hobbies), activities: list(text.hobbies), interests: list(text.interests),
      can_help_with: list(text.can_help_with), wants_to_learn: list(text.wants_to_learn),
      ...(avatar_path ? { avatar_path } : {}),
    }).eq("id", user.id);
    if (profileError) { setMessage(profileError.message); setBusy(false); return; }
    await supabase.from("user_skills").delete().eq("user_id", user.id);
    if (selected.length) {
      const { error } = await supabase.from("user_skills").insert([...new Set(selected)].map((skill_id) => ({ user_id: user.id, skill_id })));
      if (error) { setMessage(error.message); setBusy(false); return; }
    }
    // Refresh the active intent so matching immediately uses the new profile.
    await supabase.from("intents").update({ updated_at: new Date().toISOString(), structured_skills: list(text.can_help_with), structured_needs: list(text.wants_to_learn) }).eq("user_id", user.id).eq("status", "ACTIVE");
    setBusy(false);
    setMessage("Saved. SYNC is now matching you on this.");
  }

  return (
    <AppShell light>
      <div className="pt-12 pb-16">
        <p className="text-xs uppercase text-muted-foreground">Edit profile</p>
        <h1 className="mt-3 text-4xl font-medium">Keep your SYNC current.</h1>
        {loading ? <p className="mt-8 text-sm text-muted-foreground">Loading…</p> : (
          <>
            <section className="mt-10 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-medium">You</h2>
              <label className="mt-5 flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground">
                {photo ? <img src={URL.createObjectURL(photo)} alt="New profile photo preview" className="h-full w-full object-cover" /> : photoUrl ? <img src={photoUrl} alt="Your profile photo" className="h-full w-full object-cover" /> : <Camera />}
                <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              </label>
              <Input className="mt-6 h-13 rounded-full px-5" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Your name" />
              <Textarea className="mt-3 min-h-24 rounded-2xl p-5" placeholder="A short human bio" maxLength={400} value={bio} onChange={(e) => setBio(e.target.value)} aria-label="Your bio" />
            </section>

            <section className="mt-3 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-medium">Your skills</h2>
              <p className="mt-2 text-sm text-muted-foreground">Tap to add or remove. Add anything that’s missing.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {skills.map((s) => {
                  const on = selected.includes(s.id);
                  return <button key={s.id} type="button" onClick={() => setSelected((v) => (on ? v.filter((x) => x !== s.id) : [...v, s.id]))} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{s.name}{on ? <X className="h-3.5 w-3.5" /> : null}</button>;
                })}
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Input className="h-13 flex-1 rounded-full px-5" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add another skill" aria-label="Add another skill" />
                <Button variant="outline" className="h-13 rounded-full px-6" onClick={addCustomSkill}>Add</Button>
              </div>
            </section>

            <section className="mt-3 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-medium">What SYNC can match you on</h2>
              <p className="mt-2 text-sm text-muted-foreground">Separate with commas.</p>
              <Input className="mt-4 h-13 rounded-full px-5" value={text.hobbies} onChange={(e) => setText({ ...text, hobbies: e.target.value })} placeholder="Hobbies & activities" aria-label="Hobbies and activities" />
              <Input className="mt-3 h-13 rounded-full px-5" value={text.interests} onChange={(e) => setText({ ...text, interests: e.target.value })} placeholder="Interests" aria-label="Interests" />
              <Input className="mt-3 h-13 rounded-full px-5" value={text.can_help_with} onChange={(e) => setText({ ...text, can_help_with: e.target.value })} placeholder="Things you know how to do" aria-label="Things you know how to do" />
              <Input className="mt-3 h-13 rounded-full px-5" value={text.wants_to_learn} onChange={(e) => setText({ ...text, wants_to_learn: e.target.value })} placeholder="Things you want to learn or do" aria-label="Things you want to learn or do" />
            </section>

            <section className="mt-3 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-medium">What brings you here</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {goals.map((g) => <button key={g} type="button" onClick={() => setGoal(g)} className={`rounded-full border px-4 py-2.5 text-sm ${goal === g ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{g[0] + g.slice(1).toLowerCase()}</button>)}
              </div>
            </section>

            {message ? <p className="mt-5 text-sm text-muted-foreground" role="status">{message}</p> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</Button>
              <Button size="lg" variant="outline" asChild><Link to="/you">Back to profile</Link></Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
