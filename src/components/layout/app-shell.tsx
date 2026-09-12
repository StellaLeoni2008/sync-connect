import { useRouterState } from "@tanstack/react-router";
import { CalendarDays, Radio, UserRound, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { SyncLogo } from "@/components/brand/sync-logo";

const tabs = [
  { to: "/sync", label: "SYNC", icon: Radio },
  { to: "/connections", label: "Connections", icon: UsersRound },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/you", label: "You", icon: UserRound },
] as const;

export function AppShell({ children, light = false }: { children: ReactNode; light?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div className={light ? "min-h-dvh bg-background text-foreground" : "dark min-h-dvh bg-background text-foreground"}>
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col border-border md:border-x">
        <header className="flex h-18 shrink-0 items-center justify-between px-4 sm:px-5">
          <SyncLogo className="text-[1.35rem]" />
          <span className="h-2 w-2 rounded-full bg-signal signal-glow" aria-label="SYNC ready" />
        </header>
        <main className="flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-5">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-[calc(4.75rem+env(safe-area-inset-bottom))] max-w-3xl items-start justify-around border-t border-border bg-background/95 px-2 pt-2 backdrop-blur" aria-label="Primary navigation">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return <a key={to} href={to} className="flex min-w-16 flex-col items-center gap-1 text-[.68rem] text-muted-foreground"><span className={active ? "flex h-9 w-9 items-center justify-center rounded-full bg-signal/15 text-signal" : "flex h-9 w-9 items-center justify-center"}><Icon className="h-[18px] w-[18px]" strokeWidth={1.6} /></span><span className={active ? "text-foreground" : ""}>{label}</span></a>;
          })}
        </nav>
      </div>
    </div>
  );
}