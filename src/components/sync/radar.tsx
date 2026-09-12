import type { NearbyPerson } from "@/lib/sync.functions";
import { SyncMark } from "@/components/brand/sync-logo";

/**
 * Proximity radar. Each person sits at their real bearing and a distance band —
 * never at an exact position, so nobody's location can be derived from the screen.
 */
export function Radar({
  people,
  radiusMeters,
  active,
  onSelect,
}: {
  people: NearbyPerson[];
  radiusMeters: number;
  active: boolean;
  onSelect: (person: NearbyPerson) => void;
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[22rem]" role="group" aria-label="People nearby">
      <div className="absolute inset-0 overflow-hidden rounded-full border border-border bg-card/40">
        {["inset-[8%]", "inset-[26%]", "inset-[44%]"].map((ring) => (
          <div key={ring} className={`absolute ${ring} rounded-full border border-border`} />
        ))}
        <div className="absolute inset-1/2 h-px w-full -translate-x-1/2 bg-border" />
        <div className="absolute inset-1/2 h-full w-px -translate-y-1/2 bg-border" />
        {active ? (
          <>
            <div className="animate-radar-sweep absolute inset-0 origin-center">
              <div className="absolute left-1/2 top-0 h-1/2 w-px bg-gradient-to-b from-signal to-transparent" />
            </div>
            <span className="animate-radar-ring absolute inset-0 rounded-full border border-signal/50" />
          </>
        ) : null}
      </div>

      <span className="signal-glow absolute inset-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-signal text-ink">
        <SyncMark className="h-6 w-5" />
      </span>

      {people.map((person, index) => {
        const band = Math.min(0.44, 0.14 + (person.distanceMeters / Math.max(1, radiusMeters)) * 0.3);
        const angle = ((person.bearing - 90) * Math.PI) / 180;
        const left = 50 + Math.cos(angle) * band * 100;
        const top = 50 + Math.sin(angle) * band * 100;
        return (
          <button
            key={person.userId}
            onClick={() => onSelect(person)}
            style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${index * 70}ms` }}
            className="animate-blip-in absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-signal/60 transition-transform active:scale-95"
            aria-label={`${person.name}, ${person.distanceMeters} metres away`}
          >
            {person.photoUrl ? (
              <img src={person.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-elevated text-sm text-foreground">{person.name.slice(0, 1)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
