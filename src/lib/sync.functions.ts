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
