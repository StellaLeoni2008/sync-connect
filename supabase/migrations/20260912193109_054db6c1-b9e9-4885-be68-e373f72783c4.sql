CREATE OR REPLACE FUNCTION private.connection_has_block(p_connection_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.connections c
    JOIN public.blocked_users b
      ON (b.blocker_id = c.user_a_id AND b.blocked_id = c.user_b_id)
      OR (b.blocker_id = c.user_b_id AND b.blocked_id = c.user_a_id)
    WHERE c.id = p_connection_id
  );
$$;
REVOKE ALL ON FUNCTION private.connection_has_block(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.connection_has_block(uuid) TO authenticated, service_role;

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL UNIQUE REFERENCES public.connections(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversations_connected_read ON public.conversations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.id = connection_id AND auth.uid() IN (c.user_a_id, c.user_b_id)
  ));

CREATE TABLE public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversation_members_connected_read ON public.conversation_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations cv
    JOIN public.connections c ON c.id = cv.connection_id
    WHERE cv.id = conversation_id AND auth.uid() IN (c.user_a_id, c.user_b_id)
  ));

CREATE OR REPLACE FUNCTION private.is_conversation_member(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id = p_conversation_id AND cm.user_id = p_user_id
  );
$$;
REVOKE ALL ON FUNCTION private.is_conversation_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_conversation_member(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.conversation_has_block(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.connection_has_block(cv.connection_id)
  FROM public.conversations cv
  WHERE cv.id = p_conversation_id;
$$;
REVOKE ALL ON FUNCTION private.conversation_has_block(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.conversation_has_block(uuid) TO authenticated, service_role;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_members_read ON public.messages
  FOR SELECT TO authenticated
  USING (private.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY messages_members_send ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND private.is_conversation_member(conversation_id, auth.uid())
    AND NOT private.conversation_has_block(conversation_id)
  );
CREATE POLICY messages_recipient_mark_read ON public.messages
  FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid()
    AND private.is_conversation_member(conversation_id, auth.uid())
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND private.is_conversation_member(conversation_id, auth.uid())
  );
CREATE INDEX messages_conversation_created_idx ON public.messages(conversation_id, created_at);

CREATE TABLE public.connection_location_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy double precision CHECK (accuracy IS NULL OR accuracy >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (owner_user_id <> recipient_user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.connection_location_shares TO authenticated;
GRANT ALL ON public.connection_location_shares TO service_role;
ALTER TABLE public.connection_location_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY location_shares_connected_read ON public.connection_location_shares
  FOR SELECT TO authenticated
  USING (
    auth.uid() IN (owner_user_id, recipient_user_id)
    AND is_active
    AND (expires_at IS NULL OR expires_at > now())
    AND EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = connection_id
        AND owner_user_id IN (c.user_a_id, c.user_b_id)
        AND recipient_user_id IN (c.user_a_id, c.user_b_id)
    )
    AND NOT private.connection_has_block(connection_id)
  );
CREATE POLICY location_shares_owner_start ON public.connection_location_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND is_active
    AND started_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
    AND EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = connection_id
        AND auth.uid() IN (c.user_a_id, c.user_b_id)
        AND recipient_user_id = CASE WHEN c.user_a_id = auth.uid() THEN c.user_b_id ELSE c.user_a_id END
    )
    AND NOT private.connection_has_block(connection_id)
  );
CREATE POLICY location_shares_owner_stop ON public.connection_location_shares
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = connection_id
        AND auth.uid() IN (c.user_a_id, c.user_b_id)
        AND recipient_user_id = CASE WHEN c.user_a_id = auth.uid() THEN c.user_b_id ELSE c.user_a_id END
    )
  );
CREATE UNIQUE INDEX one_active_location_share_per_owner_connection
  ON public.connection_location_shares(connection_id, owner_user_id)
  WHERE is_active;
CREATE INDEX location_shares_recipient_idx
  ON public.connection_location_shares(recipient_user_id, connection_id, updated_at DESC);
CREATE TRIGGER connection_location_shares_updated
  BEFORE UPDATE ON public.connection_location_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.events
  ADD COLUMN event_type text NOT NULL DEFAULT 'OTHER'
    CHECK (event_type IN ('HACKATHON','CONFERENCE','CAMPUS','SOCIAL','SPORTS','STUDY','NETWORKING','OTHER')),
  ADD COLUMN cover_path text,
  ADD COLUMN discovery_radius_m integer NOT NULL DEFAULT 500
    CHECK (discovery_radius_m BETWEEN 50 AND 5000),
  ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','CANCELLED'));

CREATE OR REPLACE FUNCTION private.ensure_connection_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  created_connection_id uuid;
  created_conversation_id uuid;
BEGIN
  IF NEW.status = 'MUTUAL' AND (OLD.status IS DISTINCT FROM 'MUTUAL') THEN
    INSERT INTO public.connections(match_id, user_a_id, user_b_id, context, match_reason)
    VALUES (NEW.id, NEW.user_a_id, NEW.user_b_id, NULL, NEW.match_reason)
    ON CONFLICT (match_id) DO UPDATE SET match_reason = EXCLUDED.match_reason
    RETURNING id INTO created_connection_id;

    INSERT INTO public.conversations(connection_id)
    VALUES (created_connection_id)
    ON CONFLICT (connection_id) DO UPDATE SET updated_at = now()
    RETURNING id INTO created_conversation_id;

    INSERT INTO public.conversation_members(conversation_id, user_id)
    VALUES (created_conversation_id, NEW.user_a_id), (created_conversation_id, NEW.user_b_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.ensure_connection_conversation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS ensure_connection_conversation ON public.match_candidates;
CREATE TRIGGER ensure_connection_conversation
  AFTER UPDATE OF status ON public.match_candidates
  FOR EACH ROW EXECUTE FUNCTION private.ensure_connection_conversation();

CREATE OR REPLACE FUNCTION private.ensure_existing_connections_have_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  connection_row public.connections;
  conversation_id_value uuid;
BEGIN
  FOR connection_row IN SELECT * FROM public.connections LOOP
    INSERT INTO public.conversations(connection_id)
    VALUES (connection_row.id)
    ON CONFLICT (connection_id) DO UPDATE SET updated_at = public.conversations.updated_at
    RETURNING id INTO conversation_id_value;

    INSERT INTO public.conversation_members(conversation_id, user_id)
    VALUES (conversation_id_value, connection_row.user_a_id), (conversation_id_value, connection_row.user_b_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
SELECT private.ensure_existing_connections_have_conversations();
DROP FUNCTION private.ensure_existing_connections_have_conversations();

CREATE TRIGGER conversations_updated
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_location_shares;