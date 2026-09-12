// SYNC matching engine — pure, deterministic, shared by server functions and the dev panel.
// Complementarity may be ONE-WAY: what A wants only needs to exist somewhere in B's
// skills / hobbies / interests / activities / things they can help with.

export type TagCategory = "SKILL" | "ACTIVITY" | "TOPIC" | "ROLE";
export type IntentType = "LEARN" | "HELP" | "ACTIVITY" | "SOCIAL" | "BUILD" | "MEET" | "EVENT";

export const RADIUS_OPTIONS_M = [100, 250, 500, 1000] as const;
export const DEFAULT_RADIUS_M = 500;
/** Presence older than this is treated as stale and never matched. */
export const PRESENCE_FRESHNESS_MS = 5 * 60 * 1000;

type LexEntry = { tag: string; category: TagCategory; aliases: string[] };

/** Canonical tag + aliases. Aliases are matched as normalized substrings/words. */
const LEXICON: LexEntry[] = [
  // Software / technical skills
  { tag: "Python", category: "SKILL", aliases: ["python", "py", "django", "flask", "pandas"] },
  { tag: "JavaScript", category: "SKILL", aliases: ["javascript", "js", "node", "nodejs", "typescript", "ts"] },
  { tag: "React", category: "SKILL", aliases: ["react", "reactjs", "react native", "nextjs", "next js"] },
  { tag: "Frontend", category: "SKILL", aliases: ["frontend", "front end", "front-end", "css", "html", "tailwind"] },
  { tag: "Backend", category: "SKILL", aliases: ["backend", "back end", "back-end", "api", "apis", "server side"] },
  { tag: "Programming", category: "SKILL", aliases: ["programming", "coding", "code", "software", "developer", "development", "engineering", "dev"] },
  { tag: "Mobile", category: "SKILL", aliases: ["mobile", "ios", "android", "swift", "kotlin", "flutter"] },
  { tag: "Data", category: "SKILL", aliases: ["data", "data science", "sql", "analytics", "statistics"] },
  { tag: "AI", category: "TOPIC", aliases: ["ai", "artificial intelligence", "machine learning", "ml", "llm", "llms", "deep learning", "neural"] },
  { tag: "Hardware", category: "SKILL", aliases: ["hardware", "electronics", "pcb", "soldering", "arduino"] },
  { tag: "Embedded Systems", category: "SKILL", aliases: ["embedded", "embedded systems", "firmware", "esp32", "microcontroller"] },
  { tag: "BLE", category: "SKILL", aliases: ["ble", "bluetooth", "bluetooth low energy"] },
  { tag: "Robotics", category: "SKILL", aliases: ["robotics", "robot", "robots", "drone", "drones"] },
  { tag: "Cybersecurity", category: "SKILL", aliases: ["cybersecurity", "security", "hacking", "pentest", "infosec"] },
  { tag: "Design", category: "SKILL", aliases: ["design", "designer", "graphic design", "visual design"] },
  { tag: "UI/UX", category: "SKILL", aliases: ["ui", "ux", "ui/ux", "ui ux", "product design", "figma", "interface", "wireframe"] },
  { tag: "Product", category: "SKILL", aliases: ["product", "product management", "pm", "roadmap"] },
  { tag: "Business", category: "SKILL", aliases: ["business", "sales", "finance", "operations", "cofounder", "co-founder"] },
  { tag: "Marketing", category: "SKILL", aliases: ["marketing", "growth", "branding", "seo", "social media"] },
  { tag: "Startups", category: "TOPIC", aliases: ["startup", "startups", "entrepreneurship", "founders", "venture", "vc", "pitch"] },
  { tag: "Research", category: "TOPIC", aliases: ["research", "paper", "papers", "academia", "thesis"] },
  { tag: "Writing", category: "SKILL", aliases: ["writing", "writer", "copywriting", "blogging", "journalism"] },
  { tag: "Video", category: "SKILL", aliases: ["video", "video editing", "filmmaking", "premiere", "editing"] },

  // Study / learning topics
  { tag: "Math", category: "TOPIC", aliases: ["math", "maths", "mathematics", "calculus", "algebra", "linear algebra", "statistics class"] },
  { tag: "Physics", category: "TOPIC", aliases: ["physics", "mechanics", "thermodynamics"] },
  { tag: "Chemistry", category: "TOPIC", aliases: ["chemistry", "organic chemistry", "chem"] },
  { tag: "Biology", category: "TOPIC", aliases: ["biology", "bio", "genetics"] },
  { tag: "Studying", category: "ACTIVITY", aliases: ["study", "studying", "study group", "homework", "exam", "midterm", "final"] },

  // Languages
  { tag: "Spanish", category: "TOPIC", aliases: ["spanish", "espanol", "español"] },
  { tag: "English", category: "TOPIC", aliases: ["english"] },
  { tag: "French", category: "TOPIC", aliases: ["french", "francais", "français"] },
  { tag: "Portuguese", category: "TOPIC", aliases: ["portuguese", "portugues", "português"] },
  { tag: "Mandarin", category: "TOPIC", aliases: ["mandarin", "chinese"] },
  { tag: "Languages", category: "TOPIC", aliases: ["language exchange", "languages", "practice a language"] },

  // Sports / activities
  { tag: "Soccer", category: "ACTIVITY", aliases: ["soccer", "football", "futbol", "fútbol", "futebol"] },
  { tag: "Basketball", category: "ACTIVITY", aliases: ["basketball", "hoops", "pickup basketball"] },
  { tag: "Running", category: "ACTIVITY", aliases: ["running", "run", "jogging", "jog", "5k", "marathon"] },
  { tag: "Fitness", category: "ACTIVITY", aliases: ["gym", "fitness", "workout", "working out", "lifting", "weights", "gym partner", "training"] },
  { tag: "Tennis", category: "ACTIVITY", aliases: ["tennis", "padel", "pickleball"] },
  { tag: "Volleyball", category: "ACTIVITY", aliases: ["volleyball"] },
  { tag: "Cycling", category: "ACTIVITY", aliases: ["cycling", "biking", "bike ride", "mountain biking"] },
  { tag: "Swimming", category: "ACTIVITY", aliases: ["swimming", "swim", "pool"] },
  { tag: "Hiking", category: "ACTIVITY", aliases: ["hiking", "hike", "trail", "trails", "climbing", "bouldering"] },
  { tag: "Skating", category: "ACTIVITY", aliases: ["skating", "skateboarding", "skate"] },
  { tag: "Yoga", category: "ACTIVITY", aliases: ["yoga", "pilates", "stretching"] },
  { tag: "Chess", category: "ACTIVITY", aliases: ["chess"] },
  { tag: "Gaming", category: "ACTIVITY", aliases: ["gaming", "video games", "valorant", "league of legends", "esports"] },

  // Hobbies / social
  { tag: "Photography", category: "ACTIVITY", aliases: ["photography", "photo", "photos", "photographer", "camera"] },
  { tag: "Music", category: "ACTIVITY", aliases: ["music", "band", "singing", "producing", "dj"] },
  { tag: "Guitar", category: "ACTIVITY", aliases: ["guitar", "bass guitar"] },
  { tag: "Piano", category: "ACTIVITY", aliases: ["piano", "keyboard lessons"] },
  { tag: "Coffee", category: "ACTIVITY", aliases: ["coffee", "grab coffee", "cafe", "café", "espresso"] },
  { tag: "Food", category: "ACTIVITY", aliases: ["food", "lunch", "dinner", "cooking", "baking", "brunch", "eat"] },
  { tag: "Conversation", category: "ACTIVITY", aliases: ["talk", "chat", "conversation", "hang out", "hangout", "company", "meet people", "socialize"] },
  { tag: "Reading", category: "ACTIVITY", aliases: ["reading", "books", "book club"] },
  { tag: "Art", category: "ACTIVITY", aliases: ["art", "drawing", "painting", "illustration"] },
  { tag: "Dancing", category: "ACTIVITY", aliases: ["dancing", "dance", "salsa", "bachata"] },
  { tag: "Travel", category: "ACTIVITY", aliases: ["travel", "traveling", "backpacking"] },
  { tag: "Volunteering", category: "ACTIVITY", aliases: ["volunteering", "volunteer", "community service"] },

  // Practical help
  { tag: "Bike Repair", category: "SKILL", aliases: ["fix my bike", "fixing my bike", "bike", "bikes", "bicycle", "bike repair", "bicycle repair"] },
  { tag: "Car Repair", category: "SKILL", aliases: ["car repair", "fix my car", "mechanic"] },
  { tag: "Moving Help", category: "SKILL", aliases: ["moving", "move furniture", "carry"] },
  { tag: "Tutoring", category: "SKILL", aliases: ["tutoring", "tutor", "teach me", "teacher", "mentor", "mentoring"] },
];

const ROLE_WORDS = ["designer", "developer", "engineer", "cofounder", "co-founder", "founder", "marketer", "mentor", "tutor", "teammate", "partner", "photographer", "writer", "hardware engineer", "product manager"];

const STOPWORDS = new Set(["i", "im", "i'm", "a", "an", "the", "to", "with", "for", "of", "and", "or", "want", "wants", "wanted", "need", "needs", "looking", "look", "someone", "somebody", "anyone", "people", "person", "who", "can", "could", "would", "my", "me", "some", "help", "about", "in", "on", "at", "is", "are", "am", "be", "get", "getting", "going", "go", "right", "now", "today", "please", "really", "just", "know", "knows", "how"]);

export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map any free-form tag (profile chip, skill row, keyword) to its canonical form. */
export function canonicalize(value: string): { tag: string; category: TagCategory } | null {
  const normalized = normalize(value);
  if (!normalized) return null;
  for (const entry of LEXICON) {
    if (normalize(entry.tag) === normalized) return { tag: entry.tag, category: entry.category };
    if (entry.aliases.some((alias) => normalize(alias) === normalized)) return { tag: entry.tag, category: entry.category };
  }
  return null;
}

/** Canonical tags for a list of free-form values; unknown values are kept verbatim (title-cased). */
export function canonicalizeMany(values: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const known = canonicalize(value);
    if (known) out.add(known.tag);
    else {
      const normalized = normalize(value);
      if (normalized) out.add(normalized.replace(/\b\w/g, (c) => c.toUpperCase()));
    }
  }
  return [...out];
}

export type ParsedIntent = {
  type: IntentType;
  desiredActivities: string[];
  desiredSkills: string[];
  desiredTopics: string[];
  desiredRoles: string[];
  keywords: string[];
};

function detectType(normalized: string, goal?: string): IntentType {
  if (/\b(learn|learning|practice|practise|study|studying|understand|teach me|get better at)\b/.test(normalized)) return "LEARN";
  if (/\b(help|fix|stuck|debug|troubleshoot|advice)\b/.test(normalized)) return "HELP";
  if (/\b(play|game|run|running|jog|gym|workout|train|hike|swim|ride|climb|dance)\b/.test(normalized)) return "ACTIVITY";
  if (/\b(coffee|lunch|dinner|hang|hangout|chat|talk|meet people|company|socialize|friends)\b/.test(normalized)) return "SOCIAL";
  if (/\b(build|building|hack|ship|project|prototype|startup|cofounder|co-founder|hire|hiring)\b/.test(normalized)) return "BUILD";
  const goals: Record<string, IntentType> = { BUILD: "BUILD", LEARN: "LEARN", HELP: "HELP", MEET: "MEET", EXPLORE: "SOCIAL", EVENT: "EVENT" };
  return (goal && goals[goal]) || "MEET";
}

/** Deterministic interpretation of a free-text intent. */
export function parseIntent(text: string, goal?: string): ParsedIntent {
  const normalized = normalize(text);
  const type = detectType(normalized, goal);
  const activities: string[] = [];
  const skills: string[] = [];
  const topics: string[] = [];

  for (const entry of LEXICON) {
    const hit = [entry.tag, ...entry.aliases].some((alias) => {
      const target = normalize(alias);
      if (!target) return false;
      return new RegExp(`(^|\\s)${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es)?($|\\s)`).test(normalized);
    });
    if (!hit) continue;
    if (entry.category === "ACTIVITY") activities.push(entry.tag);
    else if (entry.category === "TOPIC") topics.push(entry.tag);
    else skills.push(entry.tag);
  }

  const roles = ROLE_WORDS.filter((role) => normalized.includes(normalize(role))).map((role) => role.replace(/\b\w/g, (c) => c.toUpperCase()));

  const freeWords = normalized
    .split(" ")
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .slice(0, 12);

  const keywords = [...new Set([...activities, ...skills, ...topics, ...roles, ...freeWords.map((w) => w.replace(/\b\w/g, (c) => c.toUpperCase()))])];

  return { type, desiredActivities: activities, desiredSkills: skills, desiredTopics: topics, desiredRoles: roles, keywords };
}

/** Everything a candidate offers, already canonicalized. */
export type CandidateOffer = {
  skills: string[];
  hobbies: string[];
  interests: string[];
  activities: string[];
  canHelpWith: string[];
};

export type MatchBreakdown = {
  score: number;
  matched: string[];
  reasons: string[];
  reciprocal: boolean;
  reciprocalMatched: string[];
  distanceMeters: number;
  proximityState: ProximityState;
  eligible: boolean;
};

/** Tags that should be treated as related (semantic neighbours), not identical. */
const RELATED_GROUPS: string[][] = [
  ["Design", "UI/UX", "Product"],
  ["Programming", "Python", "JavaScript", "React", "Frontend", "Backend", "Mobile", "Data", "Software"],
  ["AI", "Data", "Research"],
  ["Fitness", "Running", "Cycling", "Swimming"],
  ["Math", "Physics", "Studying"],
  ["Startups", "Business", "Product", "Marketing"],
  ["Music", "Guitar", "Piano", "Dancing"],
  ["Coffee", "Food", "Conversation"],
  ["Hardware", "Embedded Systems", "Robotics", "BLE"],
  ["Tutoring", "Studying"],
  ["Languages", "Spanish", "English", "French", "Portuguese", "Mandarin"],
];

function relatedTo(tag: string) {
  const normalized = normalize(tag);
  const out = new Set([normalized]);
  for (const group of RELATED_GROUPS) {
    if (group.some((member) => normalize(member) === normalized)) group.forEach((member) => out.add(normalize(member)));
  }
  return out;
}

function intersect(wanted: string[], offered: string[]) {
  const offeredSet = new Set<string>();
  for (const tag of offered) relatedTo(tag).forEach((value) => offeredSet.add(value));
  const hits = wanted.filter((tag) => offeredSet.has(normalize(tag)));
  const seen = new Set<string>();
  return hits.filter((tag) => {
    const key = normalize(tag);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type ProximityState = "NEARBY" | "CLOSE" | "VERY_CLOSE";

/** Human label for a proximity state (the stored value uses an underscore). */
export function proximityLabel(state: string | null | undefined) {
  return (state ?? "NEARBY").replace("_", " ").toLowerCase();
}

export function proximityState(distanceMeters: number): ProximityState {
  if (distanceMeters <= 50) return "VERY_CLOSE";
  if (distanceMeters <= 200) return "CLOSE";
  return "NEARBY";
}

export function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * One-way complementarity: does anything the seeker wants exist in what the candidate offers?
 * Reciprocity (the candidate also wanting something the seeker offers) is a bonus only.
 */
export function scoreMatch(input: {
  intent: ParsedIntent;
  candidate: CandidateOffer;
  candidateWants?: string[];
  seekerOffers?: string[];
  distanceMeters: number;
  radiusMeters: number;
  presenceAgeMs: number;
  sameEvent?: boolean;
}): MatchBreakdown {
  const { intent, candidate, distanceMeters, radiusMeters, presenceAgeMs } = input;
  const wanted = [...new Set([...intent.desiredSkills, ...intent.desiredActivities, ...intent.desiredTopics, ...intent.keywords])];

  const skillHits = intersect([...intent.desiredSkills, ...intent.desiredRoles, ...intent.keywords], [...candidate.skills, ...candidate.canHelpWith]);
  const activityHits = intersect([...intent.desiredActivities, ...intent.keywords], [...candidate.activities, ...candidate.hobbies]);
  const interestHits = intersect([...intent.desiredTopics, ...intent.keywords], candidate.interests);

  const matched = [...new Set([...skillHits, ...activityHits, ...interestHits])];
  const reciprocalMatched = intersect(input.candidateWants ?? [], input.seekerOffers ?? []);

  const reasons: string[] = [];
  let score = 0;
  if (skillHits.length) {
    score += 40 + Math.min(15, (skillHits.length - 1) * 5);
    reasons.push(`Knows ${skillHits.join(", ")}`);
  }
  if (activityHits.length) {
    score += 38 + Math.min(15, (activityHits.length - 1) * 5);
    reasons.push(`Into ${activityHits.join(", ")}`);
  }
  if (interestHits.length) {
    score += 24 + Math.min(10, (interestHits.length - 1) * 4);
    reasons.push(`Interested in ${interestHits.join(", ")}`);
  }

  // Proximity comes first: being nearby and available is enough to be discoverable.
  // Skills, activities and interests only add context and improve the ordering.
  const withinRadius = distanceMeters <= radiusMeters;
  const fresh = presenceAgeMs <= PRESENCE_FRESHNESS_MS;
  if (withinRadius) {
    const closeness = 1 - Math.min(1, distanceMeters / Math.max(1, radiusMeters));
    score += 30 + Math.round(closeness * 20);
  }
  if (fresh) score += Math.round((1 - Math.min(1, presenceAgeMs / PRESENCE_FRESHNESS_MS)) * 5);
  if (input.sameEvent) {
    score += 8;
    reasons.push("At the same event");
  }
  if (reciprocalMatched.length) {
    score += 12;
    reasons.push(`Also looking for ${reciprocalMatched.join(", ")}`);
  }

  if (!reasons.length) reasons.push("Nearby and open to meeting right now");
  const eligible = withinRadius && fresh;
  return {
    score: Math.max(0, Math.min(99, Math.round(score))),
    matched: matched.length ? matched : wanted.slice(0, 3),
    reasons,
    reciprocal: reciprocalMatched.length > 0,
    reciprocalMatched,
    distanceMeters: Math.round(distanceMeters),
    proximityState: proximityState(distanceMeters),
    eligible,
  };
}
