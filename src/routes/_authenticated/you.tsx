import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/you")({
  head: () => ({ meta: [{ title: "Your profile — SYNC" }, { name: "description", content: "Manage your SYNC profile, interests, and notification preferences." }, { property: "og:title", content: "Your profile — SYNC" }, { property: "og:description", content: "Manage what SYNC can match you on." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: You,
});

function You() {
  const { user } = Route.useRouteContext();
  const isGuest = Boolean((user as { is_anonymous?: boolean }).is_anonymous);
  const [prefs, setPrefs] = useState({ strong_sync: true, mutual_sync: true, help_alert: true, resync: true, haptics: true });
  const [name, setName] = useState("");
  const [tags, setTags] = useState({ hobbies: "", interests: "", can_help_with: "" });
  const [saved, setSaved] = useState(false);
  const [upgrade, setUpgrade] = useState({ email: "", password: "" });
  const [upgradeMessage, setUpgradeMessage] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("name,hobbies,interests,can_help_with").eq("id", user.id).single().then(({ data }) => {
      setName(data?.name ?? "");
      setTags({ hobbies: (data?.hobbies ?? []).join(", "), interests: (data?.interests ?? []).join(", "), can_help_with: (data?.can_help_with ?? []).join(", ") });
    });
    supabase.from("notification_preferences").select("strong_sync,mutual_sync,help_alert,resync,haptics").eq("user_id", user.id).maybeSingle().then(({ data }) => { if (data) setPrefs(data); });
  }, [user.id]);

  async function change(k: keyof typeof prefs, v: boolean) {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    await supabase.from("notification_preferences").upsert({ user_id: user.id, ...next });
  }

  async function saveTags() {
    const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
    await supabase.from("profiles").update({ hobbies: list(tags.hobbies), activities: list(tags.hobbies), interests: list(tags.interests), can_help_with: list(tags.can_help_with) }).eq("id", user.id);
    setSaved(true);
  }

  async function linkGoogle() {
    setUpgradeMessage("");
    const { error } = await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo: `${window.location.origin}/you` } });
    if (error) setUpgradeMessage(error.message);
  }

  async function addEmail() {
    setUpgradeMessage("");
    const { error } = await supabase.auth.updateUser({ email: upgrade.email.trim(), password: upgrade.password });
    setUpgradeMessage(error ? error.message : "Check your email to confirm. Everything you’ve made stays with your account.");
  }

  return (
    <AppShell light>
      <div className="pt-12">
        <p className="text-xs uppercase text-muted-foreground">You</p>
        <h1 className="mt-3 text-4xl font-medium">{name || "Your profile"}</h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><Link to="/edit-profile">Edit profile</Link></Button>
          {isGuest ? <span className="inline-flex items-center rounded-full border border-border px-4 py-2 text-xs uppercase text-muted-foreground">Guest</span> : null}
        </div>

        {isGuest ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-medium">Save your account</h2>
            <p className="mt-2 text-sm text-muted-foreground">Add Google or an email so you can sign back in on any device. Your profile, skills, matches, chats and events stay exactly as they are.</p>
            <Button variant="outline" className="mt-5" onClick={linkGoogle}>Connect Google</Button>
            <Input className="mt-4 h-13 rounded-full px-5" type="email" placeholder="Email" value={upgrade.email} onChange={(e) => setUpgrade({ ...upgrade, email: e.target.value })} aria-label="Email" />
            <Input className="mt-3 h-13 rounded-full px-5" type="password" placeholder="Create a password" value={upgrade.password} onChange={(e) => setUpgrade({ ...upgrade, password: e.target.value })} aria-label="Create a password" />
            <Button variant="outline" className="mt-4" onClick={addEmail}>Add email</Button>
            {upgradeMessage ? <p className="mt-4 text-sm text-muted-foreground" role="status">{upgradeMessage}</p> : null}
          </div>
        ) : null}

        <div className="mt-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-medium">Notifications & haptics</h2>
          {Object.entries(prefs).map(([k, v]) => (
            <label key={k} className="flex items-center justify-between border-b border-border py-4 last:border-0">
              <span className="text-sm">{k.replaceAll("_", " ")}</span>
              <Switch checked={v} onCheckedChange={(x) => change(k as keyof typeof prefs, x)} />
            </label>
          ))}
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-medium">What SYNC can match you on</h2>
          <p className="mt-2 text-sm text-muted-foreground">Separate with commas. Hobbies and interests count as much as skills.</p>
          <Input className="mt-4 h-13 rounded-full px-5" value={tags.hobbies} onChange={(e) => { setSaved(false); setTags({ ...tags, hobbies: e.target.value }); }} placeholder="Hobbies & activities" aria-label="Hobbies and activities" />
          <Input className="mt-3 h-13 rounded-full px-5" value={tags.interests} onChange={(e) => { setSaved(false); setTags({ ...tags, interests: e.target.value }); }} placeholder="Interests" aria-label="Interests" />
          <Input className="mt-3 h-13 rounded-full px-5" value={tags.can_help_with} onChange={(e) => { setSaved(false); setTags({ ...tags, can_help_with: e.target.value }); }} placeholder="You can help with" aria-label="You can help with" />
          <Button className="mt-4" variant="outline" onClick={saveTags}>{saved ? "Saved" : "Save"}</Button>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-medium">SYNC Band</h2>
          <p className="mt-2 text-sm text-muted-foreground">Your phone has everything you need. Band setup requires the native app.</p>
          <Button variant="outline" className="mt-5" asChild><Link to="/band">Explore the Band</Link></Button>
        </div>

        <Button variant="outline" className="mt-8" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}>Sign out</Button>
      </div>
    </AppShell>
  );
}
