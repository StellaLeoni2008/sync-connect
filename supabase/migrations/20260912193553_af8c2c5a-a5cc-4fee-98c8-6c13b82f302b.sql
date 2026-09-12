CREATE OR REPLACE FUNCTION private.can_view_profile(target_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT target_user = auth.uid() OR (
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = target_user)
         OR (b.blocker_id = target_user AND b.blocked_id = auth.uid())
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.match_candidates m
        WHERE m.status IN ('MUTUAL','MET')
          AND auth.uid() IN (m.user_a_id,m.user_b_id)
          AND target_user IN (m.user_a_id,m.user_b_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.connections c
        WHERE auth.uid() IN (c.user_a_id,c.user_b_id)
          AND target_user IN (c.user_a_id,c.user_b_id)
      )
    )
  );
$$;
REVOKE ALL ON FUNCTION private.can_view_profile(uuid) FROM PUBLIC, anon, authenticated;