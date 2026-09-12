// Server-side fan-out: looks up a user's registered devices, respects their
// notification preferences, and sends one web push per device.
import { sendWebPush, type PushMessage } from "@/lib/webpush.server";

const PREFERENCE_BY_KIND: Record<string, string> = {
  SYNC_REQUEST: "sync_requests",
  SYNC_ACCEPTED: "sync_requests",
  STRONG_SYNC: "strong_sync",
  MUTUAL_SYNC: "mutual_sync",
  RESYNC: "resync",
  HELP_ALERT: "help_alert",
  NEW_MESSAGE: "new_messages",
  PEOPLE_NEARBY: "people_nearby",
  EVENT_UPDATE: "nearby_events",
};

export async function pushToUser(userId: string, kind: string, message: PushMessage) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const column = PREFERENCE_BY_KIND[kind];
  if (column) {
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (prefs && (prefs as Record<string, unknown>)[column] === false) return;
  }

  const { data: subscriptions } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId);
  if (!subscriptions?.length) return;

  const results = await Promise.all(
    subscriptions.map(async (subscription) => ({
      id: subscription.id,
      outcome: await sendWebPush(subscription, message),
    })),
  );

  const stale = results.filter((result) => result.outcome === "gone").map((result) => result.id);
  if (stale.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
}
