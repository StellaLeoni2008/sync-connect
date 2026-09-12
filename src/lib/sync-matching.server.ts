import {
  DEFAULT_RADIUS_M,
  PRESENCE_FRESHNESS_MS,
  canonicalizeMany,
  haversineMeters,
  scoreMatch,
  type CandidateOffer,
  type MatchBreakdown,
  type ParsedIntent,
} from "@/lib/matching";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type OfferProfile = CandidateOffer & { name: string };

export async function offersFor(userId: string): Promise<OfferProfile> {
  const db = await admin();
  const [{ data: profile }, { data: skillRows }] = await Promise.all([
    db.from("profiles").select("name,hobbies,interests,activities,can_help_with,wants_to_learn").eq("id", userId).maybeSingle(),
    db.from("user_skills").select("skills(name)").eq("user_id", userId),
  ]);
  const skillNames = (skillRows ?? []).flatMap((row) => {
    const skill = row.skills as unknown as { name?: string } | null;
    return skill?.name ? [skill.name] : [];
  });
  return {
    name: profile?.name ?? "",
    skills: canonicalizeMany(skillNames),
    hobbies: canonicalizeMany(profile?.hobbies ?? []),
    interests: canonicalizeMany(profile?.interests ?? []),
    activities: canonicalizeMany(profile?.activities ?? []),
    canHelpWith: canonicalizeMany(profile?.can_help_with ?? []),
  };
}

function parsedFromRow(row: {
  intent_type: string | null;
  desired_activities: string[] | null;
  desired_skills: string[] | null;
  desired_topics: string[] | null;
  desired_roles: string[] | null;
  keywords: string[] | null;
}): ParsedIntent {
  return {
    type: (row.intent_type as ParsedIntent["type"]) ?? "MEET",
    desiredActivities: row.desired_activities ?? [],
    desiredSkills: row.desired_skills ?? [],
    desiredTopics: row.desired_topics ?? [],
    desiredRoles: row.desired_roles ?? [],
    keywords: row.keywords ?? [],
  };
}

export type MatchPassResult = {
  status: "OK" | "NO_PRESENCE" | "DISCOVERY_OFF" | "NO_INTENT";
  intent: ParsedIntent | null;
  intentText: string | null;
  radiusMeters: number;
  nearbyActiveCount: number;
  candidates: (MatchBreakdown & { userId: string })[];
  createdMatchId: string | null;
};

/** Server-authoritative nearby match pass. Never trusts client distance or scores. */
export async function runMatchPass(userId: string): Promise<MatchPassResult> {
  const db = await admin();
  const empty: MatchPassResult = { status: "NO_PRESENCE", intent: null, intentText: null, radiusMeters: DEFAULT_RADIUS_M, nearbyActiveCount: 0, candidates: [], createdMatchId: null };

  const { data: mine } = await db.from("user_presence").select("*").eq("user_id", userId).maybeSingle();
  if (!mine) return empty;
  if (!mine.discovery_active) return { ...empty, status: "DISCOVERY_OFF", radiusMeters: mine.sync_radius_m };

  const { data: intentRow } = await db
    .from("intents")
    .select("id,original_text,intent_type,desired_activities,desired_skills,desired_topics,desired_roles,keywords")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!intentRow) return { ...empty, status: "NO_INTENT", radiusMeters: mine.sync_radius_m };

  const parsed = parsedFromRow(intentRow);
  const myOffers = await offersFor(userId);
  const myOfferTags = [...new Set([...myOffers.skills, ...myOffers.canHelpWith, ...myOffers.activities, ...myOffers.hobbies, ...myOffers.interests])];

  const freshCutoff = new Date(Date.now() - PRESENCE_FRESHNESS_MS).toISOString();
  const { data: others } = await db
    .from("user_presence")
    .select("user_id,latitude,longitude,updated_at,event_id,sync_radius_m")
    .eq("discovery_active", true)
    .gte("updated_at", freshCutoff)
    .neq("user_id", userId);

  const { data: blocks } = await db.from("blocked_users").select("blocker_id,blocked_id").or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  const blocked = new Set((blocks ?? []).flatMap((row) => [row.blocker_id, row.blocked_id]));

  const radiusMeters = mine.sync_radius_m ?? DEFAULT_RADIUS_M;
  const candidates: (MatchBreakdown & { userId: string })[] = [];

  for (const other of others ?? []) {
    if (blocked.has(other.user_id)) continue;
    const distanceMeters = haversineMeters(mine, other);
    const effectiveRadius = Math.min(radiusMeters, other.sync_radius_m ?? DEFAULT_RADIUS_M);
    const offer = await offersFor(other.user_id);
    const { data: theirIntent } = await db
      .from("intents")
      .select("intent_type,desired_activities,desired_skills,desired_topics,desired_roles,keywords")
      .eq("user_id", other.user_id)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const theirWants = theirIntent
      ? [...new Set([...(theirIntent.desired_skills ?? []), ...(theirIntent.desired_activities ?? []), ...(theirIntent.desired_topics ?? []), ...(theirIntent.keywords ?? [])])]
      : [];

    const breakdown = scoreMatch({
      intent: parsed,
      candidate: offer,
      candidateWants: theirWants,
      seekerOffers: myOfferTags,
      distanceMeters,
      radiusMeters: effectiveRadius,
      presenceAgeMs: Date.now() - new Date(other.updated_at).getTime(),
      sameEvent: Boolean(mine.event_id && other.event_id && mine.event_id === other.event_id),
    });
    candidates.push({ ...breakdown, userId: other.user_id });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates.find((candidate) => candidate.eligible);
  let createdMatchId: string | null = null;

  if (best) {
    const [userA, userB] = userId < best.userId ? [userId, best.userId] : [best.userId, userId];
    const { data: existing } = await db
      .from("match_candidates")
      .select("id")
      .eq("user_a_id", userA)
      .eq("user_b_id", userB)
      .in("status", ["PENDING", "WAITING", "MUTUAL", "MET"])
      .limit(1)
      .maybeSingle();
    if (existing) {
      createdMatchId = existing.id;
      await db.from("match_candidates").update({ proximity_state: best.proximityState, compatibility_score: best.score }).eq("id", existing.id);
    } else {
      const { data: theirIntentId } = await db.from("intents").select("id").eq("user_id", best.userId).eq("status", "ACTIVE").order("created_at", { ascending: false }).limit(1).maybeSingle();
      const myNeeds = best.matched;
      const theirNeeds = best.reciprocalMatched;
      const [intentA, intentB] = userA === userId ? [intentRow.id, theirIntentId?.id ?? intentRow.id] : [theirIntentId?.id ?? intentRow.id, intentRow.id];
      const [needsA, needsB] = userA === userId ? [myNeeds, theirNeeds] : [theirNeeds, myNeeds];
      const { data: created } = await db
        .from("match_candidates")
        .insert({
          user_a_id: userA,
          user_b_id: userB,
          intent_a_id: intentA,
          intent_b_id: intentB,
          compatibility_score: best.score,
          match_reason: best.reasons.join(" · ") || "Your intent matches what they offer.",
          user_a_needs: needsA,
          user_b_needs: needsB,
          proximity_state: best.proximityState,
          status: "PENDING",
        })
        .select("id")
        .single();
      createdMatchId = created?.id ?? null;
      if (createdMatchId) {
        await db.from("notifications").insert([
          { user_id: userA, kind: "STRONG_SYNC", title: "SYNC FOUND", body: "Someone nearby may be worth meeting.", match_id: createdMatchId },
          { user_id: userB, kind: "STRONG_SYNC", title: "SYNC FOUND", body: "Someone nearby may be worth meeting.", match_id: createdMatchId },
        ]);
      }
    }
  }

  return {
    status: "OK",
    intent: parsed,
    intentText: intentRow.original_text,
    radiusMeters,
    nearbyActiveCount: (others ?? []).length,
    candidates,
    createdMatchId,
  };
}
