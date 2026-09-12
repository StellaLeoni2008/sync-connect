import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SyncLogo } from "@/components/brand/sync-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — SYNC" }, { name: "description", content: "Sign in to SYNC and meet the right people around you." }, { property: "og:title", content: "Sign in — SYNC" }, { property: "og:description", content: "Your real-world connections start here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setMessage("");
    if (mode === "reset") { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); setMessage(error?.message ?? "Check your email for a reset link."); setBusy(false); return; }
    if (mode === "signup") { const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }); if (error) setMessage(error.message); else if (!data.session) setMessage("Check your email to confirm your account."); else navigate({ to: "/onboarding" }); setBusy(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setMessage(error.message); else navigate({ to: "/sync" }); setBusy(false);
  }
  async function google() { const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); if (result.error) setMessage(result.error.message); else if (!result.redirected) navigate({ to: "/sync" }); }
  return <main className="dark min-h-screen bg-background px-5 py-10 text-foreground"><div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-sm flex-col"><SyncLogo className="text-2xl" /><div className="my-auto py-16"><p className="mb-5 text-xs uppercase text-signal">Right person. Right place. Right time.</p><h1 className="text-4xl font-medium leading-tight">{mode === "signup" ? "Meet the people you’re supposed to meet." : mode === "reset" ? "Reset your password." : "Welcome back."}</h1><div className="mt-10 space-y-3"><Input aria-label="Email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-13 rounded-full bg-card px-5" />{mode !== "reset" ? <Input aria-label="Password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-13 rounded-full bg-card px-5" /> : null}<Button size="lg" className="w-full" disabled={busy} onClick={submit}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}</Button>{mode !== "reset" ? <Button variant="dark" size="lg" className="w-full" onClick={google}>Continue with Google</Button> : null}{message ? <p className="pt-2 text-sm text-muted-foreground" role="status">{message}</p> : null}</div><div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground"><button onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Already have an account?" : "Create an account"}</button><button onClick={() => setMode("reset")}>Forgot password?</button></div></div></div></main>;
}