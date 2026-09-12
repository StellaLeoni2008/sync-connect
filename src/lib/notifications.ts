// Browser notifications: asked for at the moment they first matter, with a cooldown
// so "people nearby" can never turn into a stream of alerts.

const COOLDOWN_MS = 30 * 60 * 1000;

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function askForNotifications() {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "default";
  }
}

/** Shows a notification at most once per cooldown window per key. */
export function notify(key: string, title: string, body: string, { cooldown = false }: { cooldown?: boolean } = {}) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const storageKey = `sync:notified:${key}`;
  if (cooldown) {
    const last = Number(window.localStorage.getItem(storageKey) ?? 0);
    if (Date.now() - last < COOLDOWN_MS) return;
    window.localStorage.setItem(storageKey, String(Date.now()));
  }
  try {
    new Notification(title, { body, tag: key });
  } catch {
    /* notifications unavailable — continue silently */
  }
}
