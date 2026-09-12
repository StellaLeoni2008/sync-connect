CREATE POLICY event_covers_connected_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'event-covers'
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id::text = (storage.foldername(name))[1]
      AND (e.is_public OR e.organizer_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.event_participants ep
        WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
      ))
  )
);
CREATE POLICY event_covers_organizer_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-covers'
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id::text = (storage.foldername(name))[1] AND e.organizer_id = auth.uid()
  )
);
CREATE POLICY event_covers_organizer_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'event-covers'
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id::text = (storage.foldername(name))[1] AND e.organizer_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'event-covers'
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id::text = (storage.foldername(name))[1] AND e.organizer_id = auth.uid()
  )
);
CREATE POLICY event_covers_organizer_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'event-covers'
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id::text = (storage.foldername(name))[1] AND e.organizer_id = auth.uid()
  )
);