import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock3, LocateFixed, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getRevealedProfile } from "@/lib/sync.functions";
import { useProximity } from "@/hooks/use-proximity";

type Duration = "15" | "60" | "stop";
type Detail = { connection: Tables<"connections">; profile: Tables<"profiles">; photo: string | null; conversationId: string | null; skills: string[] };
export const Route = createFileRoute("/_authenticated/connections/$connectionId")({head:()=>({meta:[{title:"Connection details — SYNC"},{name:"description",content:"View a mutual connection, message them, or share your location temporarily."},{property:"og:title",content:"Connection details — SYNC"},{property:"og:description",content:"Private messaging and consensual location sharing after a mutual SYNC."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}), component: ConnectionDetail });

function ConnectionDetail() {
  const { user } = Route.useRouteContext();
  const { connectionId } = Route.useParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [shares, setShares] = useState<Tables<"connection_location_shares">[]>([]);
  const [duration, setDuration] = useState<Duration>("15");
  const [notice, setNotice] = useState("");
  const { locating, error: locationError, requestFix } = useProximity();
  const load = useCallback(async () => {
    const { data: connection } = await supabase.from("connections").select("*").eq("id", connectionId).single();
    if (!connection) return;
    const otherId = connection.user_a_id === user.id ? connection.user_b_id : connection.user_a_id;
    const [revealed, conversation, skillRows, locationRows] = await Promise.all([
      getRevealedProfile({ data: { userId: otherId } }),
      supabase.from("conversations").select("id").eq("connection_id", connectionId).maybeSingle(),
      supabase.from("user_skills").select("skills(name)").eq("user_id", otherId),
      supabase.from("connection_location_shares").select("*").eq("connection_id", connectionId).eq("is_active", true),
    ]);
    const skills = (skillRows.data ?? []).flatMap((row) => {
      const skill = row.skills as unknown as { name: string } | null;
      return skill?.name ? [skill.name] : [];
    });
    setDetail({ connection, profile: revealed.profile, photo: revealed.photoUrl, conversationId: conversation.data?.id ?? null, skills });
    setShares((locationRows.data ?? []).filter((s) => !s.expires_at || new Date(s.expires_at) > new Date()));
  }, [connectionId, user.id]);
  useEffect(() => {
    load();
    const channel = supabase.channel(`location:${connectionId}`).on("postgres_changes", { event: "*", schema: "public", table: "connection_location_shares", filter: `connection_id=eq.${connectionId}` }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [connectionId, load]);
  async function shareLocation() {
    if (!detail || duration === "stop") return;
    const fix = await requestFix();
    if (!fix) return;
    const recipient = detail.connection.user_a_id === user.id ? detail.connection.user_b_id : detail.connection.user_a_id;
    await supabase.from("connection_location_shares").update({ is_active: false }).eq("connection_id", connectionId).eq("owner_user_id", user.id).eq("is_active", true);
    const { error } = await supabase.from("connection_location_shares").insert({ connection_id: connectionId, owner_user_id: user.id, recipient_user_id: recipient, latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy, expires_at: new Date(Date.now() + Number(duration) * 60_000).toISOString() });
    setNotice(error ? error.message : `Location shared for ${duration === "15" ? "15 minutes" : "1 hour"}.`);
    load();
  }
  async function stopSharing() {
    await supabase.from("connection_location_shares").update({ is_active: false }).eq("connection_id", connectionId).eq("owner_user_id", user.id).eq("is_active", true);
    setNotice("Location sharing stopped."); load();
  }
  if (!detail) return <AppShell light><div className="py-24 text-center text-sm text-muted-foreground">Connection unavailable.</div></AppShell>;
  const mine = shares.find((s) => s.owner_user_id === user.id);
  const theirs = shares.find((s) => s.recipient_user_id === user.id);
  const tags = [...new Set([...detail.skills, ...detail.profile.can_help_with, ...detail.profile.wants_to_learn, ...detail.profile.hobbies, ...detail.profile.interests])];
  return <AppShell light><div className="pb-8 pt-6"><a href="/connections" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4"/>Connections</a><section className="mt-8 text-center">{detail.photo?<img src={detail.photo} alt={detail.profile.name} className="mx-auto h-28 w-28 rounded-full object-cover"/>:<div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-secondary text-3xl">{detail.profile.name.slice(0,1)}</div>}<h1 className="mt-5 text-4xl font-medium">{detail.profile.name}</h1><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{detail.profile.bio || detail.connection.context || detail.connection.match_reason}</p><div className="mt-6 flex flex-wrap justify-center gap-2">{tags.slice(0,10).map((tag)=><span key={tag} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs">{tag}</span>)}</div>{detail.conversationId?<Button asChild className="mt-7"><a href={`/chat/${detail.conversationId}`}><MessageCircle/>Message</a></Button>:null}</section><section className="mt-10 rounded-2xl border border-border bg-card p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-signal"/><div><h2 className="font-medium">Private location sharing</h2><p className="mt-1 text-sm text-muted-foreground">Only {detail.profile.name} can see it. It expires automatically.</p></div></div>{theirs?<a href={`https://www.openstreetmap.org/?mlat=${theirs.latitude}&mlon=${theirs.longitude}#map=16/${theirs.latitude}/${theirs.longitude}`} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-3 rounded-xl bg-secondary p-4"><MapPin className="h-5 w-5 text-signal"/><span className="text-sm"><strong>{detail.profile.name} shared a location</strong><br/><span className="text-muted-foreground">Open map · {theirs.accuracy ? `accurate to about ${Math.round(theirs.accuracy)}m` : "live location"}</span></span></a>:null}<div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]"><Select value={duration} onValueChange={(v)=>setDuration(v as Duration)}><SelectTrigger className="h-11 rounded-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="15">Share for 15 minutes</SelectItem><SelectItem value="60">Share for 1 hour</SelectItem></SelectContent></Select><Button onClick={shareLocation} disabled={locating}><LocateFixed/>{locating?"Locating…":"Share location"}</Button></div>{mine?<Button variant="outline" className="mt-3 w-full" onClick={stopSharing}><Clock3/>Stop sharing now</Button>:null}{notice||locationError?<p className="mt-3 text-sm text-muted-foreground" role="status">{notice||locationError}</p>:null}</section></div></AppShell>;
}
