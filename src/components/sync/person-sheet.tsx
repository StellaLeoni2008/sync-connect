import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { NearbyPerson } from "@/lib/sync.functions";

/** Profile preview for one person on the radar, with the single primary action. */
export function PersonSheet({
  person,
  busy,
  onClose,
  onRequest,
}: {
  person: NearbyPerson | null;
  busy: boolean;
  onClose: () => void;
  onRequest: (person: NearbyPerson) => void;
}) {
  return (
    <Sheet open={Boolean(person)} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent side="bottom" className="dark mx-auto max-w-3xl rounded-t-3xl border-border bg-card px-5 pb-8 text-foreground">
        {person ? (
          <>
            <SheetHeader className="px-0">
              <div className="flex items-center gap-4">
                {person.photoUrl ? (
                  <img src={person.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-xl">{person.name.slice(0, 1)}</span>
                )}
                <div className="min-w-0">
                  <SheetTitle className="text-2xl font-medium">{person.name}</SheetTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {person.distanceMeters < 1000 ? `${person.distanceMeters} m away` : `${(person.distanceMeters / 1000).toFixed(1)} km away`}
                  </p>
                </div>
              </div>
            </SheetHeader>

            {person.bio ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{person.bio}</p> : null}

            {person.tags.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {person.tags.map((tag) => (
                  <span key={tag} className={`rounded-full border px-3 py-1.5 text-xs ${person.shared.includes(tag) ? "border-signal text-signal" : "border-border text-muted-foreground"}`}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-7">
              {person.status === "CONNECTED" ? (
                <Button asChild className="w-full" size="lg">
                  <Link to="/connections">Open connection</Link>
                </Button>
              ) : person.status === "REQUESTED" ? (
                <Button className="w-full" size="lg" disabled>
                  Request sent
                </Button>
              ) : person.status === "INCOMING" && person.matchId ? (
                <Button asChild className="w-full" size="lg">
                  <Link to="/match/$matchId" params={{ matchId: person.matchId }}>They want to sync — respond</Link>
                </Button>
              ) : (
                <Button className="w-full" size="lg" disabled={busy} onClick={() => onRequest(person)}>
                  {busy ? "Sending…" : "Request Sync"}
                </Button>
              )}
              <p className="mt-3 text-center text-xs text-muted-foreground">Exact locations stay private until you both agree to meet.</p>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
