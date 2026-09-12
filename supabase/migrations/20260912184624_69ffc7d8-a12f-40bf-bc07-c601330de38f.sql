CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

DROP POLICY profiles_visible ON public.profiles;
DROP POLICY connected_skills_read ON public.user_skills;
DROP FUNCTION public.can_view_profile(uuid);

CREATE OR REPLACE FUNCTION private.can_view_profile(target_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT target_user = auth.uid() OR EXISTS (SELECT 1 FROM public.match_candidates m WHERE m.status IN ('MUTUAL','MET') AND auth.uid() IN (m.user_a_id,m.user_b_id) AND target_user IN (m.user_a_id,m.user_b_id)) OR EXISTS (SELECT 1 FROM public.connections c WHERE auth.uid() IN (c.user_a_id,c.user_b_id) AND target_user IN (c.user_a_id,c.user_b_id));
$$;
REVOKE ALL ON FUNCTION private.can_view_profile(uuid) FROM PUBLIC, anon, authenticated;
CREATE POLICY profiles_visible ON public.profiles FOR SELECT TO authenticated USING (private.can_view_profile(id));
CREATE POLICY connected_skills_read ON public.user_skills FOR SELECT TO authenticated USING (private.can_view_profile(user_id));

CREATE OR REPLACE FUNCTION private.process_match_response() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE m public.match_candidates; interested_count integer;
BEGIN
  SELECT * INTO m FROM public.match_candidates WHERE id=NEW.match_id FOR UPDATE;
  IF NEW.user_id NOT IN (m.user_a_id,m.user_b_id) THEN RAISE EXCEPTION 'User is not a match participant'; END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_users b WHERE (b.blocker_id=m.user_a_id AND b.blocked_id=m.user_b_id) OR (b.blocker_id=m.user_b_id AND b.blocked_id=m.user_a_id)) THEN RAISE EXCEPTION 'Match unavailable'; END IF;
  IF NEW.response='NOT_NOW' THEN UPDATE public.match_candidates SET status='DECLINED',updated_at=now() WHERE id=NEW.match_id; RETURN NEW; END IF;
  SELECT count(*) INTO interested_count FROM public.match_responses WHERE match_id=NEW.match_id AND response='INTERESTED';
  IF interested_count=2 THEN
    UPDATE public.match_candidates SET status='MUTUAL',updated_at=now() WHERE id=NEW.match_id;
    IF OLD IS NULL OR OLD.response <> 'INTERESTED' THEN INSERT INTO public.notifications(user_id,kind,title,body,match_id) VALUES(m.user_a_id,'MUTUAL_SYNC','It''s a SYNC','You''re both interested.',NEW.match_id),(m.user_b_id,'MUTUAL_SYNC','It''s a SYNC','You''re both interested.',NEW.match_id); END IF;
  ELSE UPDATE public.match_candidates SET status='WAITING',updated_at=now() WHERE id=NEW.match_id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.process_match_response() FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.respond_to_match(uuid,text);
DROP TRIGGER validate_match_response ON public.match_responses;
DROP FUNCTION public.validate_match_response_user();
CREATE TRIGGER process_match_response AFTER INSERT OR UPDATE ON public.match_responses FOR EACH ROW EXECUTE FUNCTION private.process_match_response();

CREATE OR REPLACE FUNCTION private.process_meeting_confirmation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE m public.match_candidates; confirmation_count integer;
BEGIN
  SELECT * INTO m FROM public.match_candidates WHERE id=NEW.match_id FOR UPDATE;
  IF m.id IS NULL OR m.status NOT IN ('MUTUAL','MET') OR NEW.user_id NOT IN (m.user_a_id,m.user_b_id) THEN RAISE EXCEPTION 'Meeting unavailable'; END IF;
  SELECT count(*) INTO confirmation_count FROM public.meeting_confirmations WHERE match_id=NEW.match_id;
  IF confirmation_count=2 THEN INSERT INTO public.connections(match_id,user_a_id,user_b_id,match_reason) VALUES(m.id,m.user_a_id,m.user_b_id,m.match_reason) ON CONFLICT(match_id) DO NOTHING; UPDATE public.match_candidates SET status='MET',updated_at=now() WHERE id=NEW.match_id; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.process_meeting_confirmation() FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.confirm_meeting(uuid);
CREATE TRIGGER process_meeting_confirmation AFTER INSERT ON public.meeting_confirmations FOR EACH ROW EXECUTE FUNCTION private.process_meeting_confirmation();