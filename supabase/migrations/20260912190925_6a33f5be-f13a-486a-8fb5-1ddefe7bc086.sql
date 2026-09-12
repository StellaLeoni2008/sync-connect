ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hobbies text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS activities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS can_help_with text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wants_to_learn text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.intents
  ADD COLUMN IF NOT EXISTS intent_type text NOT NULL DEFAULT 'MEET',
  ADD COLUMN IF NOT EXISTS desired_activities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS desired_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS desired_topics text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS desired_roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  geohash text,
  discovery_active boolean NOT NULL DEFAULT false,
  sync_radius_m integer NOT NULL DEFAULT 500,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presence_own_select" ON public.user_presence FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "presence_own_insert" ON public.user_presence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "presence_own_update" ON public.user_presence FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "presence_own_delete" ON public.user_presence FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER user_presence_updated BEFORE UPDATE ON public.user_presence FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_presence_active ON public.user_presence (discovery_active, updated_at);