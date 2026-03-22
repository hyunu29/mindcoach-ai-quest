-- Create emotions table for tracking daily emotions
CREATE TABLE public.emotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emotions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own emotions" ON public.emotions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own emotions" ON public.emotions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own emotions" ON public.emotions FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_emotions_user_id ON public.emotions(user_id);
CREATE INDEX idx_emotions_created_at ON public.emotions(created_at);