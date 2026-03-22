
-- Drop existing tables (test_results depends on tests via FK)
DROP TABLE IF EXISTS public.test_results CASCADE;
DROP TABLE IF EXISTS public.tests CASCADE;

-- Recreate tests table with text id
CREATE TABLE public.tests (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  question_count integer NOT NULL DEFAULT 20,
  duration_minutes integer NOT NULL DEFAULT 3,
  recommended boolean NOT NULL DEFAULT false,
  subdomains jsonb NOT NULL DEFAULT '[]'::jsonb,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tests are viewable by everyone"
  ON public.tests FOR SELECT
  USING (true);

-- Recreate test_results table with text test_id
CREATE TABLE public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id text NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score integer NOT NULL DEFAULT 0,
  risk_level text,
  matched_syndromes jsonb DEFAULT '[]'::jsonb,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own results"
  ON public.test_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own results"
  ON public.test_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
