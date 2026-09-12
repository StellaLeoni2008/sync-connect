import syncLogo from "@/assets/sync-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function SyncMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 44" aria-hidden="true" className={cn("h-8 w-7", className)} fill="none">
      <path d="M21.7 2 6 24.2h11.2L14.1 42 30 18.4H19.2L21.7 2Z" fill="currentColor" />
    </svg>
  );
}

export function SyncLogo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label="SYNC">
      {mark ? <SyncMark className="h-[1em] w-[.72em]" /> : null}
      <svg viewBox="0 0 184 38" aria-hidden="true" className="h-[1em] w-auto fill-current">
        <path d="M3 30.7h30.3c3.7 0 5.8-1.2 5.8-3.5 0-2-1.5-3-4.8-3.4l-17.8-2C7.3 20.8 3 17.2 3 10.9 3 3.7 8.8.3 19.8.3h25v7H18.6c-3.5 0-5.3 1.1-5.3 3.3 0 1.9 1.6 2.9 4.8 3.2l17.8 2c9.1 1 13.5 4.6 13.5 11 0 7.5-5.7 11-17.1 11H3v-7.1Z" />
        <path d="m48.5.3 17.7 21.4L83.9.3h12.4L71.5 29.4v8.4H60.9v-8.4L36.1.3h12.4Z" />
        <path d="M97.7.3h10.4l35.3 25.5V.3H154v37.5h-10.3L108.3 12v25.8H97.7V.3Z" />
        <path d="M177.5 0c4.8 0 9.2.7 13.5 2.1v7.5a40.8 40.8 0 0 0-12.3-2c-10.9 0-16.4 3.8-16.4 11.4s5.5 11.4 16.4 11.4c4.1 0 8.2-.7 12.3-2v7.5a42 42 0 0 1-13.5 2.1c-17.4 0-26.1-6.3-26.1-19S160.1 0 177.5 0Z" transform="translate(-7)" />
      </svg>
    </span>
  );
}
export function SyncWordmark({ className }: { className?: string }) {
  return <img src={syncLogo.url} alt="SYNC" className={cn("h-7 w-auto select-none invert dark:invert-0 sm:h-8", className)} draggable={false} />;
}
