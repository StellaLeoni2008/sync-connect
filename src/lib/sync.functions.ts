import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_RADIUS_M, parseIntent } from "@/lib/matching";

const coordsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().nullable().optional(),
  radiusMeters: z.number().int().min(50).max(5000).optional(),
  eventId: z.string().uuid().nullable().optional(),
});

const intentSchema = z.object({
  text: z.string().trim().min(3).max(1000),
  goal: z.enum(["BUILD", "MEET", "LEARN", "HELP", "EXPLORE", "EVENT"]),
  eventId: z.string().uuid().nullable().optional(),
  location: coordsSchema,
});

/** Writes the caller's own presence row. Coordinates are never readable by other clients. */
export const updatePresence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => coordsSchema.extend({ discoveryActive: z.boolean().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_presence").upsert(
      {
        user_id: context.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy ?? null,
        discovery_active: data.discoveryActive ?? true,
        sync_radius_m: data.radiusMeters ?? DEFAULT_RADIUS_M,
        event_id: data.eventId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const activateSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => intentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const parsed = parseIntent(data.text, data.goal);
    const offeredTags = [...new Set([...parsed.desiredSkills, ...parsed.desiredActivities, ...parsed.desiredTopics])];

    const { data: intent, error: intentError } = await context.supabase
      .from("intents")
      .insert({
        user_id: context.userId,
        original_text: data.text,
        goal: data.goal,
        structured_needs: offeredTags,
        structured_skills: offeredTags,
        interpretation_source: "deterministic",
        intent_type: parsed.type,
        desired_activities: parsed.desiredActivities,
        desired_skills: parsed.desiredSkills,
        desired_topics: parsed.desiredTopics,
        desired_roles: parsed.desiredRoles,
        keywords: parsed.keywords,
        event_id: data.eventId ?? null,
        status: "ACTIVE",
      })
      .select("id")
      .single();
    if (intentError) throw new Error(intentError.message);

    await context.supabase.from("discovery_sessions").update({ state: "STOPPED", ended_at: new Date().toISOString() }).eq("user_id", context.userId).eq("state", "ACTIVE");
    const { error: discoveryError } = await context.supabase.from("discovery_sessions").insert({ user_id: context.userId, intent_id: intent.id, state: "ACTIVE" });
    if (discoveryError) throw new Error(discoveryError.message);
    await context.supabase.from("profiles").update({ discovery_enabled: true, primary_context: data.goal }).eq("id", context.userId);

    const { error: presenceError } = await context.supabase.from("user_presence").upsert(
      {
        user_id: context.userId,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        accuracy: data.location.accuracy ?? null,
        discovery_active: true,
        sync_radius_m: data.location.radiusMeters ?? DEFAULT_RADIUS_M,
        event_id: data.eventId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (presenceError) throw new Error(presenceError.message);

    const { runMatchPass } = await import("@/lib/sync-matching.server");
    const pass = await runMatchPass(context.userId);
    return { intentId: intent.id, interpretation: parsed, matchId: pass.createdMatchId, nearbyActiveCount: pass.nearbyActiveCount };
  });

/** Re-runs the nearby search. Safe to call on realtime events or a controlled interval. */
export const findNearbySyncs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runMatchPass } = await import("@/lib/sync-matching.server");
    const pass = await runMatchPass(context.userId);
    return { status: pass.status, matchId: pass.createdMatchId, nearbyActiveCount: pass.nearbyActiveCount, eligibleCount: pass.candidates.filter((c) => c.eligible).length };
  });

export const stopSync = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await context.supabase.from("discovery_sessions").update({ state: "STOPPED", ended_at: new Date().toISOString() }).eq("user_id", context.userId).eq("state", "ACTIVE");
  await context.supabase.from("profiles").update({ discovery_enabled: false }).eq("id", context.userId);
  await context.supabase.from("user_presence").update({ discovery_active: false }).eq("user_id", context.userId);
  return { ok: true };
});

/** Development diagnostics for the caller only. Never exposes other users' coordinates. */
export const getSyncDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runMatchPass } = await import("@/lib/sync-matching.server");
    const { data: presence } = await context.supabase.from("user_presence").select("*").eq("user_id", context.userId).maybeSingle();
    const pass = await runMatchPass(context.userId);
    return {
      userId: context.userId,
      presence: presence
        ? {
            latitude: presence.latitude,
            longitude: presence.longitude,
            accuracy: presence.accuracy,
            discoveryActive: presence.discovery_active,
            radiusMeters: presence.sync_radius_m,
            updatedAt: presence.updated_at,
          }
        : null,
      status: pass.status,
      intentText: pass.intentText,
      interpretation: pass.intent,
      nearbyActiveCount: pass.nearbyActiveCount,
      candidates: pass.candidates.map((candidate) => ({
        userId: candidate.userId,
        score: candidate.score,
        eligible: candidate.eligible,
        matched: candidate.matched,
        reasons: candidate.reasons,
        reciprocal: candidate.reciprocal,
        distanceMeters: candidate.distanceMeters,
        proximityState: candidate.proximityState,
      })),
      matchId: pass.createdMatchId,
    };
  });

export const getRevealedProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile, error } = await context.supabase.from("profiles").select("*").eq("id", data.userId).single();
    if (error) throw new Error("This identity has not been revealed.");
    let photoUrl: string | null = null;
    if (profile.avatar_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage.from("profile-photos").createSignedUrl(profile.avatar_path, 900);
      photoUrl = signed?.signedUrl ?? null;
    }
    return { profile, photoUrl };
  });

/* ---------------------------------------------------------------------------
 * Proximity-first discovery: nearby people, sync requests, responses.
 * Coordinates never leave the server — only rounded distances and bearings do.
 * ------------------------------------------------------------------------- */

const NEARBY_FRESHNESS_MS = 10 * 60 * 1000;

export type NearbyPerson = {
  userId: string;
  name: string;
  bio: string;
  photoUrl: string | null;
  distanceMeters: number;
  bearing: number;
  proximityState: string;
  tags: string[];
  shared: string[];
  status: "NONE" | "REQUESTED" | "INCOMING" | "CONNECTED";
  matchId: string | null;
};

/** Anyone nearby, available and fresh. Skills only sort the list — they never hide people. */
export const getNearbyPeople = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ people: NearbyPerson[]; radiusMeters: number; discoveryActive: boolean }> => {
    const { haversineMeters, proximityState, DEFAULT_RADIUS_M: fallbackRadius } = await import("@/lib/matching");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: mine } = await context.supabase.from("user_presence").select("*").eq("user_id", context.userId).maybeSingle();
    const radiusMeters = mine?.sync_radius_m ?? fallbackRadius;
    if (!mine || !mine.discovery_active) return { people: [], radiusMeters, discoveryActive: false };

    const since = new Date(Date.now() - NEARBY_FRESHNESS_MS).toISOString();
    const [{ data: others }, { data: blocks }, { data: connections }, { data: matches }] = await Promise.all([
      supabaseAdmin.from("user_presence").select("user_id,latitude,longitude,updated_at,discovery_active,event_id").eq("discovery_active", true).gte("updated_at", since),
      supabaseAdmin.from("blocked_users").select("blocker_id,blocked_id").or(`blocker_id.eq.${context.userId},blocked_id.eq.${context.userId}`),
      supabaseAdmin.from("connections").select("user_a_id,user_b_id").or(`user_a_id.eq.${context.userId},user_b_id.eq.${context.userId}`),
      supabaseAdmin.from("match_candidates").select("id,user_a_id,user_b_id,status").or(`user_a_id.eq.${context.userId},user_b_id.eq.${context.userId}`).in("status", ["PENDING", "WAITING", "MUTUAL", "MET"]),
    ]);

    const blocked = new Set((blocks ?? []).flatMap((row) => [row.blocker_id, row.blocked_id]));
    blocked.delete(context.userId);
    const connected = new Set((connections ?? []).map((row) => (row.user_a_id === context.userId ? row.user_b_id : row.user_a_id)));

    const candidates = (others ?? []).filter((row) => row.user_id !== context.userId && !blocked.has(row.user_id));
    const withDistance = candidates
      .map((row) => ({ row, distance: haversineMeters(mine, row) }))
      .filter(({ distance }) => distance <= radiusMeters);
    if (!withDistance.length) return { people: [], radiusMeters, discoveryActive: true };

    const ids = withDistance.map(({ row }) => row.user_id);
    const [{ data: profiles }, { data: myProfile }, { data: responses }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,name,bio,avatar_path,interests,hobbies,activities,can_help_with,wants_to_learn,discovery_enabled").in("id", ids),
      supabaseAdmin.from("profiles").select("interests,hobbies,activities,can_help_with,wants_to_learn").eq("id", context.userId).maybeSingle(),
      supabaseAdmin.from("match_responses").select("match_id,user_id,response").eq("user_id", context.userId),
    ]);

    const myTags = new Set(
      [...(myProfile?.interests ?? []), ...(myProfile?.hobbies ?? []), ...(myProfile?.activities ?? []), ...(myProfile?.can_help_with ?? []), ...(myProfile?.wants_to_learn ?? [])].map((tag) => tag.toLowerCase()),
    );
    const respondedTo = new Set((responses ?? []).map((row) => row.match_id));

    const people: NearbyPerson[] = [];
    for (const { row, distance } of withDistance) {
      const profile = (profiles ?? []).find((entry) => entry.id === row.user_id);
      if (!profile) continue;
      const tags = [...new Set([...(profile.can_help_with ?? []), ...(profile.interests ?? []), ...(profile.hobbies ?? []), ...(profile.activities ?? [])])].slice(0, 8);
      const shared = tags.filter((tag) => myTags.has(tag.toLowerCase()));
      let photoUrl: string | null = null;
      if (profile.avatar_path) {
        const { data: signed } = await supabaseAdmin.storage.from("profile-photos").createSignedUrl(profile.avatar_path, 900);
        photoUrl = signed?.signedUrl ?? null;
      }
      const match = (matches ?? []).find((entry) => entry.user_a_id === row.user_id || entry.user_b_id === row.user_id);
      const status: NearbyPerson["status"] = connected.has(row.user_id)
        ? "CONNECTED"
        : match
          ? respondedTo.has(match.id)
            ? "REQUESTED"
            : "INCOMING"
          : "NONE";
      people.push({
        userId: row.user_id,
        name: profile.name,
        bio: profile.bio ?? "",
        photoUrl,
        distanceMeters: Math.round(distance),
        bearing: bearingBetween(mine, row),
        proximityState: proximityState(distance),
        tags,
        shared,
        status,
        matchId: match?.id ?? null,
      });
    }

    people.sort((a, b) => a.distanceMeters - b.distanceMeters || b.shared.length - a.shared.length);
    return { people, radiusMeters, discoveryActive: true };
  });

function bearingBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude));
  const x = Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) - Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude));
  return (Math.round((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/** Ensures the caller has an active intent so requests and auto-matching can reference one. */
async function ensureIntent(supabase: { from: (table: string) => any }, userId: string, text: string) {
  const { data: existing } = await supabase.from("intents").select("id").eq("user_id", userId).eq("status", "ACTIVE").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing?.id) return existing.id as string;
  const { parseIntent: parse } = await import("@/lib/matching");
  const parsed = parse(text, "MEET");
  const { data: created, error } = await supabase
    .from("intents")
    .insert({
      user_id: userId,
      original_text: text,
      goal: "MEET",
      structured_needs: [],
      structured_skills: [],
      interpretation_source: "deterministic",
      intent_type: parsed.type,
      desired_activities: parsed.desiredActivities,
      desired_skills: parsed.desiredSkills,
      desired_topics: parsed.desiredTopics,
      desired_roles: parsed.desiredRoles,
      keywords: parsed.keywords,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

/** Turns discovery on with an optional one-line status. Proximity alone makes you discoverable. */
export const startDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ status: z.string().trim().max(140).optional(), location: coordsSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const text = data.status?.trim() || "Open to meeting interesting people nearby";
    await ensureIntent(context.supabase as never, context.userId, text);
    await context.supabase.from("profiles").update({ discovery_enabled: true }).eq("id", context.userId);
    const { error } = await context.supabase.from("user_presence").upsert(
      {
        user_id: context.userId,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        accuracy: data.location.accuracy ?? null,
        discovery_active: true,
        sync_radius_m: data.location.radiusMeters ?? DEFAULT_RADIUS_M,
        event_id: data.location.eventId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sends a direct Sync request to someone on the radar. */
export const requestSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid(), note: z.string().trim().max(200).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You can’t sync with yourself.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { haversineMeters, proximityState } = await import("@/lib/matching");

    const { data: blocked } = await supabaseAdmin
      .from("blocked_users")
      .select("blocker_id")
      .or(`and(blocker_id.eq.${context.userId},blocked_id.eq.${data.userId}),and(blocker_id.eq.${data.userId},blocked_id.eq.${context.userId})`)
      .maybeSingle();
    if (blocked) throw new Error("This person isn’t available.");

    const { data: existing } = await supabaseAdmin
      .from("match_candidates")
      .select("id,status")
      .or(
        `and(user_a_id.eq.${context.userId},user_b_id.eq.${data.userId}),and(user_a_id.eq.${data.userId},user_b_id.eq.${context.userId})`,
      )
      .in("status", ["PENDING", "WAITING", "MUTUAL", "MET"])
      .maybeSingle();

    const myIntentId = await ensureIntent(context.supabase as never, context.userId, "Open to meeting interesting people nearby");
    let matchId = existing?.id ?? null;

    if (!matchId) {
      const [{ data: mine }, { data: theirs }, { data: theirIntent }, { data: myProfile }] = await Promise.all([
        supabaseAdmin.from("user_presence").select("latitude,longitude").eq("user_id", context.userId).maybeSingle(),
        supabaseAdmin.from("user_presence").select("latitude,longitude").eq("user_id", data.userId).maybeSingle(),
        supabaseAdmin.from("intents").select("id").eq("user_id", data.userId).eq("status", "ACTIVE").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from("profiles").select("name").eq("id", context.userId).maybeSingle(),
      ]);
      const distance = mine && theirs ? haversineMeters(mine, theirs) : 0;
      const reason = data.note?.trim() || `${myProfile?.name ?? "Someone"} is nearby and wants to sync`;
      const { data: created, error } = await supabaseAdmin
        .from("match_candidates")
        .insert({
          user_a_id: context.userId,
          user_b_id: data.userId,
          intent_a_id: myIntentId,
          intent_b_id: theirIntent?.id ?? myIntentId,
          compatibility_score: 60,
          match_reason: reason,
          user_a_needs: [],
          user_b_needs: [],
          proximity_state: proximityState(distance),
          status: "PENDING",
          origin: "REQUEST",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      matchId = created.id;

      await supabaseAdmin.from("notifications").insert({
        user_id: data.userId,
        kind: "SYNC_REQUEST",
        title: "Someone nearby wants to sync",
        body: reason,
        match_id: matchId,
      });
    }

    await supabaseAdmin.from("match_responses").upsert({ match_id: matchId, user_id: context.userId, response: "INTERESTED" }, { onConflict: "match_id,user_id" });
    return { matchId };
  });

export type SyncRequest = { matchId: string; userId: string; name: string; photoUrl: string | null; reason: string; distanceLabel: string };

/** Inbound requests the caller hasn't answered yet. */
export const getSyncRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SyncRequest[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: matches } = await context.supabase
      .from("match_candidates")
      .select("id,user_a_id,user_b_id,match_reason,proximity_state")
      .in("status", ["PENDING", "WAITING"])
      .order("created_at", { ascending: false });
    if (!matches?.length) return [];
    const { data: responses } = await supabaseAdmin.from("match_responses").select("match_id").eq("user_id", context.userId);
    const answered = new Set((responses ?? []).map((row) => row.match_id));
    const pending = matches.filter((row) => !answered.has(row.id));
    if (!pending.length) return [];

    const out: SyncRequest[] = [];
    for (const row of pending) {
      const otherId = row.user_a_id === context.userId ? row.user_b_id : row.user_a_id;
      const { data: profile } = await supabaseAdmin.from("profiles").select("name,avatar_path").eq("id", otherId).maybeSingle();
      if (!profile) continue;
      let photoUrl: string | null = null;
      if (profile.avatar_path) {
        const { data: signed } = await supabaseAdmin.storage.from("profile-photos").createSignedUrl(profile.avatar_path, 900);
        photoUrl = signed?.signedUrl ?? null;
      }
      out.push({ matchId: row.id, userId: otherId, name: profile.name, photoUrl, reason: row.match_reason, distanceLabel: (row.proximity_state ?? "NEARBY").replace("_", " ").toLowerCase() });
    }
    return out;
  });

/** Accept or decline. Accepting lets the existing mutual-consent trigger create the connection. */
export const respondToSyncRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ matchId: z.string().uuid(), accept: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("match_responses")
      .upsert({ match_id: data.matchId, user_id: context.userId, response: data.accept ? "INTERESTED" : "NOT_NOW" }, { onConflict: "match_id,user_id" });
    if (error) throw new Error(error.message);
    const { data: match } = await context.supabase.from("match_candidates").select("status").eq("id", data.matchId).maybeSingle();
    return { status: match?.status ?? null };
  });
