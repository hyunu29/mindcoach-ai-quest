
-- 감정기록 테이블
CREATE TABLE public.emotion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  primary_emotion TEXT NOT NULL,
  secondary_emotions TEXT[] DEFAULT '{}',
  emotion_score INTEGER NOT NULL CHECK (emotion_score >= 1 AND emotion_score <= 5),
  situation TEXT,
  body_reaction TEXT[] DEFAULT '{}',
  ai_comment TEXT,
  conversation_log JSONB DEFAULT '[]'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emotion_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own emotion_records" ON public.emotion_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emotion_records" ON public.emotion_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emotion_records" ON public.emotion_records FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own emotion_records" ON public.emotion_records FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 스트릭 테이블
CREATE TABLE public.emotion_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_record_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emotion_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own streak" ON public.emotion_streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streak" ON public.emotion_streaks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streak" ON public.emotion_streaks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
