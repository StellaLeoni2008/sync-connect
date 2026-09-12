import { Link, useRouterState } from "@tanstack/react-router";
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
    <div className={light ? "min-h-screen bg-background text-foreground" : "dark min-h-screen bg-background text-foreground"}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-border">
        <header className="flex h-20 items-center justify-between px-5">
          <SyncLogo className="text-[1.35rem]" />
          <span className="h-2 w-2 rounded-full bg-signal signal-glow" aria-label="SYNC ready" />
        </header>
        <main className="flex-1 px-5 pb-28">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-20 max-w-md items-center justify-around border-t border-border bg-background/95 px-2 backdrop-blur" aria-label="Primary navigation">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return <Link key={to} to={to} className="flex min-w-16 flex-col items-center gap-1 text-[.68rem] text-muted-foreground"><span className={active ? "flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground" : "flex h-9 w-9 items-center justify-center"}><Icon className="h-[18px] w-[18px]" strokeWidth={1.6} /></span><span className={active ? "text-foreground" : ""}>{label}</span></Link>;
          })}
        </nav>
      </div>
    </div>
  );
}