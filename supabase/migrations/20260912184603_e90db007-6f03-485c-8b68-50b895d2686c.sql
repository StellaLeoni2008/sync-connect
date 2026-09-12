CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  avatar_path text,
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 400),
  primary_context text CHECK (primary_context IN ('BUILD','MEET','LEARN','HELP','EXPLORE','EVENT')),
  onboarding_complete boolean NOT NULL DEFAULT false,
  discovery_enabled boolean NOT NULL DEFAULT false,
  event_only_discovery boolean NOT NULL DEFAULT false,
  help_requests_enabled boolean NOT NULL DEFAULT true,
  serendipity_enabled boolean NOT NULL DEFAULT true,
  resync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 60),
  normalized_name text GENERATED ALWAYS AS (lower(trim(name))) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY skills_read ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY skills_add ON public.skills FOR INSERT TO authenticated WITH CHECK (char_length(name) BETWEEN 1 AND 60);

CREATE TABLE public.user_skills (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_skills TO authenticated;
GRANT ALL ON public.user_skills TO service_role;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_skills_own ON public.user_skills FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_text text NOT NULL CHECK (char_length(original_text) BETWEEN 3 AND 1000),
  goal text NOT NULL CHECK (goal IN ('BUILD','MEET','LEARN','HELP','EXPLORE','EVENT')),
  structured_needs text[] NOT NULL DEFAULT '{}',
  structured_skills text[] NOT NULL DEFAULT '{}',
  interpretation_source text NOT NULL DEFAULT 'deterministic' CHECK (interpretation_source IN ('ai','deterministic')),
  event_id uuid,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','EXPIRED','DELETED')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intents TO authenticated;
GRANT ALL ON public.intents TO service_role;
ALTER TABLE public.intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY intents_own ON public.intents FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX intents_active_idx ON public.intents(user_id, status, created_at DESC);

CREATE TABLE public.discovery_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'ACTIVE' CHECK (state IN ('ACTIVE','STOPPED','EXPIRED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discovery_sessions TO authenticated;
GRANT ALL ON public.discovery_sessions TO service_role;
ALTER TABLE public.discovery_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY discovery_own ON public.discovery_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE UNIQUE INDEX one_active_discovery_per_user ON public.discovery_sessions(user_id) WHERE state = 'ACTIVE';

CREATE TABLE public.proximity_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ephemeral_token_hash text NOT NULL CHECK (char_length(ephemeral_token_hash) >= 32),
  proximity_state text CHECK (proximity_state IN ('NEARBY','CLOSE','VERY_CLOSE')),
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  observed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
GRANT SELECT, INSERT, DELETE ON public.proximity_observations TO authenticated;
GRANT ALL ON public.proximity_observations TO service_role;
ALTER TABLE public.proximity_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY observations_own ON public.proximity_observations FOR ALL TO authenticated USING (observer_id = auth.uid()) WITH CHECK (observer_id = auth.uid());
CREATE INDEX proximity_hash_recent_idx ON public.proximity_observations(ephemeral_token_hash, observed_at DESC);

CREATE TABLE public.match_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  intent_a_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  intent_b_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  compatibility_score integer NOT NULL CHECK (compatibility_score BETWEEN 0 AND 100),
  match_reason text NOT NULL CHECK (char_length(match_reason) BETWEEN 1 AND 500),
  user_a_needs text[] NOT NULL DEFAULT '{}',
  user_b_needs text[] NOT NULL DEFAULT '{}',
  proximity_state text CHECK (proximity_state IN ('NEARBY','CLOSE','VERY_CLOSE')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','WAITING','MUTUAL','DECLINED','EXPIRED','MET')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a_id <> user_b_id)
);
GRANT SELECT, UPDATE ON public.match_candidates TO authenticated;
GRANT ALL ON public.match_candidates TO service_role;
ALTER TABLE public.match_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY match_participants_read ON public.match_candidates FOR SELECT TO authenticated USING (auth.uid() IN (user_a_id, user_b_id));
CREATE INDEX matches_user_a_idx ON public.match_candidates(user_a_id, status, created_at DESC);
CREATE INDEX matches_user_b_idx ON public.match_candidates(user_b_id, status, created_at DESC);

CREATE TABLE public.match_responses (
  match_id uuid NOT NULL REFERENCES public.match_candidates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response text NOT NULL CHECK (response IN ('INTERESTED','NOT_NOW')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.match_responses TO authenticated;
GRANT ALL ON public.match_responses TO service_role;
ALTER TABLE public.match_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY responses_participants_read ON public.match_responses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.match_candidates m WHERE m.id = match_id AND auth.uid() IN (m.user_a_id, m.user_b_id)));
CREATE POLICY responses_own_insert ON public.match_responses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.match_candidates m WHERE m.id = match_id AND auth.uid() IN (m.user_a_id, m.user_b_id)));
CREATE POLICY responses_own_update ON public.match_responses FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.meeting_confirmations (
  match_id uuid NOT NULL REFERENCES public.match_candidates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);
GRANT SELECT, INSERT ON public.meeting_confirmations TO authenticated;
GRANT ALL ON public.meeting_confirmations TO service_role;
ALTER TABLE public.meeting_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY meeting_participants_read ON public.meeting_confirmations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.match_candidates m WHERE m.id = match_id AND m.status IN ('MUTUAL','MET') AND auth.uid() IN (m.user_a_id, m.user_b_id)));
CREATE POLICY meeting_own_insert ON public.meeting_confirmations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.match_candidates m WHERE m.id = match_id AND m.status = 'MUTUAL' AND auth.uid() IN (m.user_a_id, m.user_b_id)));

CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL UNIQUE REFERENCES public.match_candidates(id) ON DELETE CASCADE,
  user_a_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  context text,
  match_reason text NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a_id <> user_b_id)
);
GRANT SELECT ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY connections_participants_read ON public.connections FOR SELECT TO authenticated USING (auth.uid() IN (user_a_id, user_b_id));
CREATE INDEX connections_a_idx ON public.connections(user_a_id, connected_at DESC);
CREATE INDEX connections_b_idx ON public.connections(user_b_id, connected_at DESC);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  venue text NOT NULL DEFAULT '' CHECK (char_length(venue) <= 160),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_read ON public.events FOR SELECT TO authenticated USING (is_public OR organizer_id = auth.uid());
CREATE POLICY events_create ON public.events FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid());
CREATE POLICY events_manage ON public.events FOR UPDATE TO authenticated USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());
CREATE POLICY events_delete ON public.events FOR DELETE TO authenticated USING (organizer_id = auth.uid());

ALTER TABLE public.intents ADD CONSTRAINT intents_event_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

CREATE TABLE public.event_participants (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_participants TO authenticated;
GRANT ALL ON public.event_participants TO service_role;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY participants_read ON public.event_participants FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid()));
CREATE POLICY participants_join ON public.event_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY participants_leave ON public.event_participants FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.team_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE, owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120), needed_skills text[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_needs TO authenticated; GRANT ALL ON public.team_needs TO service_role; ALTER TABLE public.team_needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_needs_event_read ON public.team_needs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.event_participants ep WHERE ep.event_id = team_needs.event_id AND ep.user_id = auth.uid()));
CREATE POLICY team_needs_own_write ON public.team_needs FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, event_id uuid REFERENCES public.events(id) ON DELETE SET NULL, description text NOT NULL CHECK (char_length(description) BETWEEN 3 AND 500), needed_skills text[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','MATCHED','RESOLVED','CANCELLED')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_requests TO authenticated; GRANT ALL ON public.help_requests TO service_role; ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY help_own ON public.help_requests FOR ALL TO authenticated USING (requester_id = auth.uid()) WITH CHECK (requester_id = auth.uid());
CREATE POLICY help_event_read ON public.help_requests FOR SELECT TO authenticated USING (event_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.event_participants ep WHERE ep.event_id = help_requests.event_id AND ep.user_id = auth.uid()));

CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, strong_sync boolean NOT NULL DEFAULT true, mutual_sync boolean NOT NULL DEFAULT true, help_alert boolean NOT NULL DEFAULT true, resync boolean NOT NULL DEFAULT true, haptics boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated; GRANT ALL ON public.notification_preferences TO service_role; ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_own ON public.notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.band_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, device_public_id text NOT NULL, nickname text NOT NULL DEFAULT 'SYNC Band', color text CHECK (color IN ('MIDNIGHT','SAND','ROSE','OLIVE','SKY','LAVENDER')), status text NOT NULL DEFAULT 'DISCONNECTED' CHECK (status IN ('DISCONNECTED','CONNECTED','NEEDS_APP')), battery_percent integer CHECK (battery_percent IS NULL OR battery_percent BETWEEN 0 AND 100), firmware_version text, haptic_intensity integer NOT NULL DEFAULT 60 CHECK (haptic_intensity BETWEEN 0 AND 100), mirror_phone_alerts boolean NOT NULL DEFAULT true, status_light boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, device_public_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.band_devices TO authenticated; GRANT ALL ON public.band_devices TO service_role; ALTER TABLE public.band_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY bands_own ON public.band_devices FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.blocked_users (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (blocker_id, blocked_id), CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated; GRANT ALL ON public.blocked_users TO service_role; ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY blocks_own ON public.blocked_users FOR ALL TO authenticated USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, reported_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, match_id uuid REFERENCES public.match_candidates(id) ON DELETE SET NULL, category text NOT NULL CHECK (category IN ('SAFETY','HARASSMENT','SPAM','IMPERSONATION','OTHER')), details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 1000), created_at timestamptz NOT NULL DEFAULT now(), CHECK (reporter_id <> reported_id)
);
GRANT SELECT, INSERT ON public.reports TO authenticated; GRANT ALL ON public.reports TO service_role; ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_own_read ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY reports_own_insert ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, kind text NOT NULL CHECK (kind IN ('STRONG_SYNC','MUTUAL_SYNC','HELP','RESYNC')), title text NOT NULL, body text NOT NULL, match_id uuid REFERENCES public.match_candidates(id) ON DELETE CASCADE, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated; GRANT ALL ON public.notifications TO service_role; ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_own ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.can_view_profile(target_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT target_user = auth.uid() OR EXISTS (SELECT 1 FROM public.match_candidates m WHERE m.status IN ('MUTUAL','MET') AND auth.uid() IN (m.user_a_id,m.user_b_id) AND target_user IN (m.user_a_id,m.user_b_id)) OR EXISTS (SELECT 1 FROM public.connections c WHERE auth.uid() IN (c.user_a_id,c.user_b_id) AND target_user IN (c.user_a_id,c.user_b_id));
$$;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;
CREATE POLICY profiles_visible ON public.profiles FOR SELECT TO authenticated USING (public.can_view_profile(id));
CREATE POLICY profiles_create_self ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_delete_self ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());
CREATE POLICY connected_skills_read ON public.user_skills FOR SELECT TO authenticated USING (public.can_view_profile(user_id));

CREATE OR REPLACE FUNCTION public.respond_to_match(p_match_id uuid, p_response text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.match_candidates; interested_count integer;
BEGIN
  IF p_response NOT IN ('INTERESTED','NOT_NOW') THEN RAISE EXCEPTION 'Invalid response'; END IF;
  SELECT * INTO m FROM public.match_candidates WHERE id = p_match_id FOR UPDATE;
  IF m.id IS NULL OR auth.uid() NOT IN (m.user_a_id,m.user_b_id) THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_users b WHERE (b.blocker_id=m.user_a_id AND b.blocked_id=m.user_b_id) OR (b.blocker_id=m.user_b_id AND b.blocked_id=m.user_a_id)) THEN RAISE EXCEPTION 'Match unavailable'; END IF;
  INSERT INTO public.match_responses(match_id,user_id,response) VALUES(p_match_id,auth.uid(),p_response) ON CONFLICT(match_id,user_id) DO UPDATE SET response=excluded.response, updated_at=now();
  IF p_response='NOT_NOW' THEN UPDATE public.match_candidates SET status='DECLINED',updated_at=now() WHERE id=p_match_id; RETURN 'DECLINED'; END IF;
  SELECT count(*) INTO interested_count FROM public.match_responses WHERE match_id=p_match_id AND response='INTERESTED';
  IF interested_count=2 THEN UPDATE public.match_candidates SET status='MUTUAL',updated_at=now() WHERE id=p_match_id; INSERT INTO public.notifications(user_id,kind,title,body,match_id) VALUES(m.user_a_id,'MUTUAL_SYNC','It''s a SYNC','You''re both interested.',p_match_id),(m.user_b_id,'MUTUAL_SYNC','It''s a SYNC','You''re both interested.',p_match_id); RETURN 'MUTUAL'; END IF;
  UPDATE public.match_candidates SET status='WAITING',updated_at=now() WHERE id=p_match_id; RETURN 'WAITING';
END; $$;
GRANT EXECUTE ON FUNCTION public.respond_to_match(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_meeting(p_match_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.match_candidates; confirmation_count integer;
BEGIN
  SELECT * INTO m FROM public.match_candidates WHERE id=p_match_id FOR UPDATE;
  IF m.id IS NULL OR m.status NOT IN ('MUTUAL','MET') OR auth.uid() NOT IN (m.user_a_id,m.user_b_id) THEN RAISE EXCEPTION 'Meeting unavailable'; END IF;
  INSERT INTO public.meeting_confirmations(match_id,user_id) VALUES(p_match_id,auth.uid()) ON CONFLICT DO NOTHING;
  SELECT count(*) INTO confirmation_count FROM public.meeting_confirmations WHERE match_id=p_match_id;
  IF confirmation_count=2 THEN INSERT INTO public.connections(match_id,user_a_id,user_b_id,match_reason) VALUES(m.id,m.user_a_id,m.user_b_id,m.match_reason) ON CONFLICT(match_id) DO NOTHING; UPDATE public.match_candidates SET status='MET',updated_at=now() WHERE id=p_match_id; RETURN 'SYNCED'; END IF;
  RETURN 'WAITING';
END; $$;
GRANT EXECUTE ON FUNCTION public.confirm_meeting(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_match_response_user() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ DECLARE m public.match_candidates; BEGIN SELECT * INTO m FROM public.match_candidates WHERE id=NEW.match_id; IF NEW.user_id NOT IN (m.user_a_id,m.user_b_id) THEN RAISE EXCEPTION 'User is not a match participant'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER validate_match_response BEFORE INSERT OR UPDATE ON public.match_responses FOR EACH ROW EXECUTE FUNCTION public.validate_match_response_user();

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER intents_updated BEFORE UPDATE ON public.intents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER discovery_updated BEFORE UPDATE ON public.discovery_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER matches_updated BEFORE UPDATE ON public.match_candidates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER responses_updated BEFORE UPDATE ON public.match_responses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER team_needs_updated BEFORE UPDATE ON public.team_needs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER help_requests_updated BEFORE UPDATE ON public.help_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER notification_preferences_updated BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER band_devices_updated BEFORE UPDATE ON public.band_devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.skills(name) VALUES ('AI'),('Software'),('Frontend'),('Backend'),('Hardware'),('BLE'),('Embedded Systems'),('ESP32'),('Design'),('Product'),('Business'),('Marketing'),('Robotics'),('Research'),('Startups');

ALTER PUBLICATION supabase_realtime ADD TABLE public.match_candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;