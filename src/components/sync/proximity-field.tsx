import { SyncMark } from "@/components/brand/sync-logo";

export function ProximityField({ active = true }: { active?: boolean }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[22rem] overflow-hidden rounded-full" aria-label={active ? "Anonymous proximity signals active" : "Discovery inactive"}>
      {["inset-[6%]", "inset-[20%]", "inset-[34%]"].map((position) => (
        <div key={position} className={`absolute ${position} rounded-full border border-border`} />
      ))}
      <div className="absolute inset-1/2 h-px w-full -translate-x-1/2 bg-border" />
      <div className="absolute inset-1/2 h-full w-px -translate-y-1/2 bg-border" />
      {active ? (
        <>
          <span className="animate-sync-drift signal-glow absolute left-[22%] top-[34%] h-2 w-2 rounded-full bg-signal" />
          <span className="animate-sync-drift absolute right-[20%] top-[56%] h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          <span className="animate-sync-pulse absolute inset-[35%] rounded-full border border-signal/40" />
          <span className="signal-glow absolute inset-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-signal text-ink">
            <SyncMark className="h-7 w-6" />
          </span>
        </>
      ) : <span className="absolute inset-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground" />}
    </div>
  );
}