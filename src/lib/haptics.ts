// Short, pleasant haptic used when a SYNC happens. Silently ignored when unsupported.
export function vibrateSync() {
  try {
    const nav = typeof navigator === "undefined" ? null : (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean });
    nav?.vibrate?.([18, 60, 28, 60, 55]);
  } catch {
    /* vibration unsupported — continue silently */
  }
}
