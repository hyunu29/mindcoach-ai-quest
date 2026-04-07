
ALTER TABLE public.emotion_records ADD COLUMN source TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE public.emotion_records ADD COLUMN source_conversation_id UUID REFERENCES public.coaching_sessions(id);
