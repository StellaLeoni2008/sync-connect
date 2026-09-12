ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS people_nearby boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sync_requests boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS new_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nearby_events boolean NOT NULL DEFAULT true;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS participant_limit integer;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_participant_limit_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_participant_limit_check CHECK (participant_limit IS NULL OR (participant_limit >= 2 AND participant_limit <= 10000));

ALTER TABLE public.match_candidates
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'AUTO';
ALTER TABLE public.match_candidates
  DROP CONSTRAINT IF EXISTS match_candidates_origin_check;
ALTER TABLE public.match_candidates
  ADD CONSTRAINT match_candidates_origin_check CHECK (origin = ANY (ARRAY['AUTO'::text, 'REQUEST'::text]));

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_kind_check CHECK (kind = ANY (ARRAY['STRONG_SYNC'::text, 'MUTUAL_SYNC'::text, 'HELP'::text, 'RESYNC'::text, 'SYNC_REQUEST'::text, 'PEOPLE_NEARBY'::text]));