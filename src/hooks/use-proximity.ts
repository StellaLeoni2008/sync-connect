import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser proximity provider for the web MVP. Web geolocation only works while the
 * page is open — a future native app can swap this provider (native location / BLE /
 * background) without touching the matching engine.
 */
export type ProximityPermission = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

export type Fix = { latitude: number; longitude: number; accuracy: number | null; at: number };

/** Minimum movement (m) or elapsed time before we push a new presence update. */
const MIN_MOVE_METERS = 25;
const MIN_INTERVAL_MS = 60_000;

function metersBetween(a: Fix, b: Fix) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function useProximity(onFix?: (fix: Fix) => void) {
  const [permission, setPermission] = useState<ProximityPermission>("unknown");
  const [fix, setFix] = useState<Fix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastPushed = useRef<Fix | null>(null);
  const handler = useRef(onFix);
  handler.current = onFix;

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      return;
    }
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((status) => {
        setPermission(status.state as ProximityPermission);
        status.onchange = () => setPermission(status.state as ProximityPermission);
      })
      .catch(() => setPermission("prompt"));
  }, []);

  const requestFix = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      return null;
    }
    setLocating(true);
    setError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }),
      );
      const next: Fix = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy ?? null, at: Date.now() };
      setPermission("granted");
      setFix(next);
      lastPushed.current = next;
      return next;
    } catch (cause) {
      const code = (cause as GeolocationPositionError | undefined)?.code;
      setPermission(code === 1 ? "denied" : "prompt");
      setError(code === 1 ? "Location permission was denied." : "We couldn’t get your location. Try again.");
      return null;
    } finally {
      setLocating(false);
    }
  }, []);

  /** Start/stop a throttled watcher; only meaningful movement or time triggers a push. */
  const watch = useCallback((active: boolean) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (!active) {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      return;
    }
    if (watchId.current !== null) return;
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const next: Fix = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy ?? null, at: Date.now() };
        setFix(next);
        const previous = lastPushed.current;
        const moved = !previous || metersBetween(previous, next) >= MIN_MOVE_METERS;
        const stale = !previous || next.at - previous.at >= MIN_INTERVAL_MS;
        if (moved || stale) {
          lastPushed.current = next;
          handler.current?.(next);
        }
      },
      () => setError("Location updates stopped."),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 },
    );
  }, []);

  useEffect(
    () => () => {
      if (watchId.current !== null && typeof navigator !== "undefined") navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    },
    [],
  );

  return { permission, fix, error, locating, requestFix, watch };
}
