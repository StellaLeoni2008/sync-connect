import { Link } from "@tanstack/react-router";
import syncLogo from "@/assets/sync-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function SyncMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 44" aria-hidden="true" className={cn("h-8 w-7", className)} fill="none">
      <path d="M21.7 2 6 24.2h11.2L14.1 42 30 18.4H19.2L21.7 2Z" fill="currentColor" />
    </svg>
  );
}

export function SyncLogo({ className }: { className?: string; mark?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="SYNC home"
      className={cn("inline-flex h-[1em] items-center", className)}
    >
      <img
        src={syncLogo.url}
        alt="SYNC"
        className="h-full w-auto max-w-full select-none object-contain invert dark:invert-0"
        draggable={false}
      />
    </Link>
  );
}
export function SyncWordmark({ className }: { className?: string }) {
  return <SyncLogo className={cn("text-[1.75rem] sm:text-[2rem]", className)} />;
}
