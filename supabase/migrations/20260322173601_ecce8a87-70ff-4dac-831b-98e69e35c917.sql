
-- coaching_sessions table
CREATE TABLE public.coaching_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  related_syndrome text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  crisis_detected boolean NOT NULL DEFAULT false,
  crisis_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON public.coaching_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.coaching_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.coaching_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- crisis_logs table
CREATE TABLE public.crisis_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.coaching_sessions(id) ON DELETE SET NULL,
  detected_keyword text NOT NULL,
  crisis_type text NOT NULL,
  severity text NOT NULL,
  user_message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crisis_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own crisis logs
CREATE POLICY "Users can view their own crisis logs"
  ON public.crisis_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert is allowed for authenticated users (for client-side logging)
CREATE POLICY "Users can insert their own crisis logs"
  ON public.crisis_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
