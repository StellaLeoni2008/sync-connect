import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const intentSchema = z.object({
  text: z.string().trim().min(3).max(1000),
  goal: z.enum(["BUILD", "MEET", "LEARN", "HELP", "EXPLORE", "EVENT"]),
  eventId: z.string().uuid().nullable().optional(),
});

const knownSkills = ["AI", "Software", "Frontend", "Backend", "Hardware", "BLE", "Embedded Systems", "ESP32", "Design", "Product", "Business", "Marketing", "Robotics", "Research", "Startups"];

function extractSkills(text: string) {
  const normalized = text.toLowerCase();
  return knownSkills.filter((skill) => normalized.includes(skill.toLowerCase()));
}

export const activateSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => intentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const structuredSkills = extractSkills(data.text);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: intent, error: intentError } = await context.supabase.from("intents").insert({
      user_id: context.userId,
      original_text: data.text,
      goal: data.goal,
      structured_needs: structuredSkills,
      structured_skills: structuredSkills,
      interpretation_source: "deterministic",
      event_id: data.eventId ?? null,
      status: "ACTIVE",
    }).select("id").single();
    if (intentError) throw new Error(intentError.message);
    await context.supabase.from("discovery_sessions").update({ state: "STOPPED", ended_at: new Date().toISOString() }).eq("user_id", context.userId).eq("state", "ACTIVE");
    const { error: discoveryError } = await context.supabase.from("discovery_sessions").insert({ user_id: context.userId, intent_id: intent.id, state: "ACTIVE" });
    if (discoveryError) throw new Error(discoveryError.message);
    await context.supabase.from("profiles").update({ discovery_enabled: true, primary_context: data.goal }).eq("id", context.userId);

    const { data: mySkillsRows } = await supabaseAdmin.from("user_skills").select("skills(name)").eq("user_id", context.userId);
    const mySkills = (mySkillsRows ?? []).flatMap((row) => {
      const skill = row.skills as unknown as { name?: string } | null;
      return skill?.name ? [skill.name] : [];
    });
    const { data: candidates } = await supabaseAdmin.from("intents").select("id,user_id,structured_needs,original_text").eq("status", "ACTIVE").neq("user_id", context.userId).order("created_at", { ascending: false }).limit(20);
    for (const candidate of candidates ?? []) {
      const { data: blocked } = await supabaseAdmin.from("blocked_users").select("blocker_id").or(`and(blocker_id.eq.${context.userId},blocked_id.eq.${candidate.user_id}),and(blocker_id.eq.${candidate.user_id},blocked_id.eq.${context.userId})`).limit(1);
      if (blocked?.length) continue;
      const { data: theirSkillRows } = await supabaseAdmin.from("user_skills").select("skills(name)").eq("user_id", candidate.user_id);
      const theirSkills = (theirSkillRows ?? []).flatMap((row) => {
        const skill = row.skills as unknown as { name?: string } | null;
        return skill?.name ? [skill.name] : [];
      });
      const aNeeds = structuredSkills.filter((skill) => theirSkills.some((item) => item.toLowerCase() === skill.toLowerCase()));
      const bNeeds = (candidate.structured_needs ?? []).filter((skill) => mySkills.some((item) => item.toLowerCase() === skill.toLowerCase()));
      const overlap = aNeeds.length + bNeeds.length;
      if (!overlap) continue;
      const score = Math.min(98, 70 + overlap * 7 + (aNeeds.length > 0 && bNeeds.length > 0 ? 10 : 0));
      const [userA, userB] = context.userId < candidate.user_id ? [context.userId, candidate.user_id] : [candidate.user_id, context.userId];
      const [intentA, intentB] = userA === context.userId ? [intent.id, candidate.id] : [candidate.id, intent.id];
      const [needsA, needsB] = userA === context.userId ? [aNeeds, bNeeds] : [bNeeds, aNeeds];
      await supabaseAdmin.from("match_candidates").insert({ user_a_id: userA, user_b_id: userB, intent_a_id: intentA, intent_b_id: intentB, compatibility_score: score, match_reason: "Your current needs and skills complement each other.", user_a_needs: needsA, user_b_needs: needsB, status: "PENDING" });
      await supabaseAdmin.from("notifications").insert([{ user_id: userA, kind: "STRONG_SYNC", title: "SYNC FOUND", body: "Someone nearby may be worth meeting." }, { user_id: userB, kind: "STRONG_SYNC", title: "SYNC FOUND", body: "Someone nearby may be worth meeting." }]);
      break;
    }
    return { intentId: intent.id, interpretationSource: "deterministic" as const };
  });

export const stopSync = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await context.supabase.from("discovery_sessions").update({ state: "STOPPED", ended_at: new Date().toISOString() }).eq("user_id", context.userId).eq("state", "ACTIVE");
  await context.supabase.from("profiles").update({ discovery_enabled: false }).eq("id", context.userId);
  return { ok: true };
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