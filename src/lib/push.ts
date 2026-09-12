// Client-side push setup: registers the push service worker, subscribes the device
// and stores it against the signed-in user so notifications arrive while SYNC is closed.
import { getPushPublicKey, savePushSubscription } from "@/lib/push.functions";

function urlBase64ToUint8Array(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

let registration: Promise<ServiceWorkerRegistration> | null = null;

export function registerPushWorker() {
  if (!pushSupported()) return null;
  if (!registration) registration = navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return registration;
}

function toKeys(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return { p256dh: json.keys?.["p256dh"] ?? "", auth: json.keys?.["auth"] ?? "" };
}

/**
 * Makes sure this browser has a live push subscription saved for the current user.
 * Safe to call on every load — existing subscriptions are just refreshed.
 */
export async function ensurePushSubscription() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = await registerPushWorker();
    if (!reg) return false;
    await navigator.serviceWorker.ready;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const { publicKey } = await getPushPublicKey();
      if (!publicKey) return false;
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const keys = toKeys(subscription);
    if (!keys.p256dh || !keys.auth) return false;
    await savePushSubscription({
      data: { endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: navigator.userAgent.slice(0, 500) },
    });
    return true;
  } catch {
    return false;
  }
}
