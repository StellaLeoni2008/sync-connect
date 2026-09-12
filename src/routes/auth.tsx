import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SyncLogo } from "@/components/brand/sync-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.5-.2-2.2H12v4.1h5.5a4.7 4.7 0 0 1-2 3.1v2.7h3.3c1.9-1.8 3-4.4 3-7.7Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.7c-.9.6-2.1 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H2.9v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.3 13.7A6 6 0 0 1 6 12c0-.6.1-1.2.3-1.7V7.6H2.9A10 10 0 0 0 2 12c0 1.6.4 3.1 1 4.4l3.3-2.7Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 2.9 7.6l3.4 2.7C7.1 7.9 9.4 6.1 12 6.1Z"/></svg>;
}

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — SYNC" }, { name: "description", content: "Sign in to SYNC and meet the right people around you." }, { property: "og:title", content: "Sign in — SYNC" }, { property: "og:description", content: "Your real-world connections start here." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setMessage("");
    if (mode === "reset") { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); setMessage(error?.message ?? "Check your email for a reset link."); setBusy(false); return; }
    if (mode === "signup") { const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }); if (error) setMessage(error.message); else if (!data.session) setMessage("Check your email to confirm your account."); else window.location.href="/onboarding"; setBusy(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setMessage(error.message); else window.location.href="/sync"; setBusy(false);
  }
  async function google() { const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/sync` }); if (result.error) setMessage(result.error.message); else if (!result.redirected) window.location.href="/sync"; }
  return <main className="dark min-h-dvh bg-background px-4 py-8 text-foreground sm:px-5 sm:py-10"><div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-sm flex-col"><SyncLogo className="text-2xl" /><div className="my-auto py-12"><p className="mb-5 text-xs uppercase text-signal">Right person. Right place. Right time.</p><h1 className="text-4xl font-medium leading-tight">{mode === "signup" ? "Meet the people you’re supposed to meet." : mode === "reset" ? "Reset your password." : "Welcome back."}</h1><div className="mt-10 space-y-3"><Input aria-label="Email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-13 rounded-full bg-card px-5" />{mode !== "reset" ? <Input aria-label="Password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-13 rounded-full bg-card px-5" /> : null}<Button size="lg" className="w-full" disabled={busy} onClick={submit}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}</Button>{mode !== "reset" ? <Button variant="google" size="lg" className="w-full" onClick={google}><GoogleMark/>Continue with Google</Button> : null}{message ? <p className="pt-2 text-sm text-muted-foreground" role="status">{message}</p> : null}</div><div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground"><button onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Already have an account?" : "Create an account"}</button><button onClick={() => setMode("reset")}>Forgot password?</button></div></div></div></main>;
}