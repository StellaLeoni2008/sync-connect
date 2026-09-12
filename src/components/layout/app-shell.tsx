import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Radio, UserRound, UsersRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { SyncWordmark } from "@/components/brand/sync-logo";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/sync", label: "SYNC", icon: Radio },
  { to: "/connections", label: "Connections", icon: UsersRound },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/you", label: "You", icon: UserRound },
] as const;

/** Unread sync requests, shown as a small badge on the SYNC tab. */
function useRequestBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;
      const load = async () => {
        const { count: total } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("kind", "SYNC_REQUEST")
          .is("read_at", null);
        setCount(total ?? 0);
      };
      await load();
      channel = supabase.channel(`badge:${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void load()).subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);
  return count;
}

export function AppShell({ children, light = false }: { children: ReactNode; light?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const requests = useRequestBadge();
  return (
    <div className={light ? "min-h-dvh bg-background text-foreground" : "dark min-h-dvh bg-background text-foreground"}>
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col border-border md:border-x">
        <header className="flex h-18 shrink-0 items-center justify-between px-4 sm:px-5">
          <Link to="/" aria-label="SYNC home" className="inline-flex items-center"><SyncWordmark /></Link>
          <span className="h-2 w-2 rounded-full bg-signal signal-glow" aria-label="SYNC ready" />
        </header>
        <main className="flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-5">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-[calc(4.75rem+env(safe-area-inset-bottom))] max-w-3xl items-start justify-around border-t border-border bg-background/95 px-2 pt-2 backdrop-blur" aria-label="Primary navigation">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(`${to}/`);
            return (
              <Link key={to} to={to} className="flex min-w-16 flex-col items-center gap-1 text-[.68rem] text-muted-foreground">
                <span className={`relative flex h-9 w-9 items-center justify-center rounded-full ${active ? "bg-signal/15 text-signal" : ""}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  {to === "/sync" && requests > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[.6rem] font-medium text-primary-foreground">{requests}</span>
                  ) : null}
                </span>
                <span className={active ? "text-foreground" : ""}>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
