import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Read the stored session first: it survives refreshes, tab switches, app restarts
    // and offline reopens, and it never bounces someone to /auth over a flaky network.
    const { data: sessionData } = await supabase.auth.getSession();
    let user = sessionData.session?.user ?? null;
    if (!user) {
      const { data } = await supabase.auth.getUser();
      user = data.user ?? null;
    }
    if (!user) throw redirect({ href: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});