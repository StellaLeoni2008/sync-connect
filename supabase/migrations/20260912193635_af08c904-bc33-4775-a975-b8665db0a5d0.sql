DROP FUNCTION public.visible_event_participant_counts(uuid);
CREATE TABLE public.event_participant_counts (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  participant_count integer NOT NULL DEFAULT 0 CHECK (participant_count >= 0)
);
GRANT SELECT ON public.event_participant_counts TO authenticated;
GRANT ALL ON public.event_participant_counts TO service_role;
ALTER TABLE public.event_participant_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_participant_counts_visible ON public.event_participant_counts
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.events e
  WHERE e.id = event_id
    AND (e.is_public OR e.organizer_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.event_participants mine
      WHERE mine.event_id = e.id AND mine.user_id = auth.uid()
    ))
));
CREATE OR REPLACE FUNCTION private.refresh_event_participant_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE target_event_id uuid;
BEGIN
  target_event_id := COALESCE(NEW.event_id, OLD.event_id);
  INSERT INTO public.event_participant_counts(event_id, participant_count)
  SELECT target_event_id, count(*)::integer FROM public.event_participants WHERE event_id = target_event_id
  ON CONFLICT (event_id) DO UPDATE SET participant_count = EXCLUDED.participant_count;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION private.refresh_event_participant_count() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER refresh_event_participant_count
AFTER INSERT OR DELETE ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION private.refresh_event_participant_count();