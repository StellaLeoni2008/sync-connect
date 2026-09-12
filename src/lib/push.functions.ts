import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public VAPID key the browser needs to create a push subscription. */
export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => ({
  publicKey: process.env["VAPID_PUBLIC_KEY"] ?? null,
}));

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  userAgent: z.string().max(500).optional(),
});

/** Stores (or refreshes) the caller's device so pushes reach it while SYNC is closed. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => subscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ endpoint: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("push_subscriptions").delete().eq("endpoint", data.endpoint).eq("user_id", context.userId);
    return { ok: true };
  });

/** Notifies the other side of a conversation about a message they haven't seen yet. */
export const notifyNewMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ conversationId: z.string().uuid(), preview: z.string().max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: members } = await context.supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", data.conversationId);
    const recipients = (members ?? []).map((m) => m.user_id).filter((id) => id !== context.userId);
    if (!recipients.length) return { ok: true };

    const { data: me } = await context.supabase.from("profiles").select("name").eq("id", context.userId).maybeSingle();
    const { pushToUser } = await import("@/lib/push.server");
    await Promise.all(
      recipients.map((userId) =>
        pushToUser(userId, "NEW_MESSAGE", {
          title: `${me?.name ?? "Someone"} sent you a message`,
          body: data.preview,
          url: `/chat/${data.conversationId}`,
          tag: `chat-${data.conversationId}`,
        }),
      ),
    );
    return { ok: true };
  });

/** Tells everyone joined to an event that something changed. */
export const notifyEventUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ eventId: z.string().uuid(), title: z.string().max(120), body: z.string().max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: event } = await context.supabase.from("events").select("id,organizer_id").eq("id", data.eventId).maybeSingle();
    if (!event || event.organizer_id !== context.userId) return { ok: false };

    const { data: participants } = await context.supabase
      .from("event_participants")
      .select("user_id")
      .eq("event_id", data.eventId);
    const { pushToUser } = await import("@/lib/push.server");
    await Promise.all(
      (participants ?? [])
        .map((p) => p.user_id)
        .filter((userId) => userId !== context.userId)
        .map((userId) =>
          pushToUser(userId, "EVENT_UPDATE", { title: data.title, body: data.body, url: `/events/${data.eventId}`, tag: `event-${data.eventId}` }),
        ),
    );
    return { ok: true };
  });
