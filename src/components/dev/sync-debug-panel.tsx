import { useCallback, useState } from "react";
import { getSyncDiagnostics } from "@/lib/sync.functions";
import type { ProximityPermission } from "@/hooks/use-proximity";

type Diagnostics = Awaited<ReturnType<typeof getSyncDiagnostics>>;

/** Development-only diagnostics. Never rendered in production builds. */
export function SyncDebugPanel({ permission, realtime }: { permission: ProximityPermission; realtime: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Diagnostics | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      setData(await getSyncDiagnostics());
    } finally {
      setBusy(false);
    }
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 max-w-[22rem] text-left">
      {open ? (
        <div className="max-h-[60vh] overflow-auto rounded-2xl border border-border bg-elevated p-4 text-xs text-foreground shadow-lg">
          <div className="flex items-center justify-between">
            <p className="uppercase tracking-[.16em] text-signal">SYNC diagnostics</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground">
              close
            </button>
          </div>
          <button onClick={refresh} className="mt-3 rounded-full border border-border px-3 py-1.5">
            {busy ? "Running match pass…" : "Run match pass"}
          </button>
          <dl className="mt-3 space-y-1">
            <Row label="Location permission" value={permission} />
            <Row label="Realtime" value={realtime} />
            <Row label="User ID" value={data?.userId ?? "—"} />
            <Row label="Pass status" value={data?.status ?? "—"} />
            <Row label="Discovery active" value={String(data?.presence?.discoveryActive ?? "—")} />
            <Row label="Latitude" value={data?.presence ? data.presence.latitude.toFixed(6) : "—"} />
            <Row label="Longitude" value={data?.presence ? data.presence.longitude.toFixed(6) : "—"} />
            <Row label="Accuracy (m)" value={data?.presence?.accuracy ? Math.round(data.presence.accuracy) : "—"} />
            <Row label="Radius (m)" value={data?.presence?.radiusMeters ?? "—"} />
            <Row label="Presence updated" value={data?.presence?.updatedAt ?? "—"} />
            <Row label="Nearby active users" value={data?.nearbyActiveCount ?? "—"} />
            <Row label="Intent" value={data?.intentText ?? "—"} />
            <Row label="Match created" value={data?.matchId ?? "—"} />
          </dl>
          {data?.interpretation ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-card p-3">{JSON.stringify(data.interpretation, null, 1)}</pre>
          ) : null}
          {data?.candidates?.length ? (
            <div className="mt-3 space-y-2">
              <p className="uppercase text-muted-foreground">Candidates</p>
              {data.candidates.map((candidate) => (
                <pre key={candidate.userId} className="whitespace-pre-wrap rounded-xl border border-border bg-card p-3">
                  {JSON.stringify(candidate, null, 1)}
                </pre>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground">No candidates in the last pass.</p>
          )}
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="rounded-full border border-border bg-elevated px-4 py-2 text-xs text-muted-foreground">
          DEV diagnostics
        </button>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate">{String(value)}</dd>
    </div>
  );
}
