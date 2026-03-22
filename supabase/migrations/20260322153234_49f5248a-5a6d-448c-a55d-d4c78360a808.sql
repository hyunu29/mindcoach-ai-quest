-- Create tests table for storing test definitions
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  category_label TEXT NOT NULL,
  description TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 20,
  duration_minutes INTEGER NOT NULL DEFAULT 3,
  is_ai_recommended BOOLEAN NOT NULL DEFAULT false,
  sub_areas JSONB NOT NULL DEFAULT '[]',
  questions JSONB NOT NULL DEFAULT '[]',
  syndromes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_results table for storing user results
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]',
  scores JSONB NOT NULL DEFAULT '{}',
  total_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Tests are publicly readable
CREATE POLICY "Tests are viewable by everyone" ON public.tests FOR SELECT USING (true);

-- Test results are user-scoped
CREATE POLICY "Users can view their own results" ON public.test_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own results" ON public.test_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_test_results_user_id ON public.test_results(user_id);
CREATE INDEX idx_test_results_test_id ON public.test_results(test_id);
CREATE INDEX idx_tests_category ON public.tests(category);