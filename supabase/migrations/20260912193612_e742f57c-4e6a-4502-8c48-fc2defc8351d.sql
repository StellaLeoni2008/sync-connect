CREATE OR REPLACE FUNCTION public.visible_event_participant_counts(requested_event_id uuid DEFAULT NULL)
RETURNS TABLE(event_id uuid, participant_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, count(ep.user_id)
  FROM public.events e
  LEFT JOIN public.event_participants ep ON ep.event_id = e.id
  WHERE auth.uid() IS NOT NULL
    AND (requested_event_id IS NULL OR e.id = requested_event_id)
    AND (
      e.is_public
      OR e.organizer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.event_participants mine
        WHERE mine.event_id = e.id AND mine.user_id = auth.uid()
      )
    )
  GROUP BY e.id;
$$;
REVOKE ALL ON FUNCTION public.visible_event_participant_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.visible_event_participant_counts(uuid) TO authenticated, service_role;