
-- Add recorded_date column
ALTER TABLE public.emotions ADD COLUMN recorded_date date NOT NULL DEFAULT CURRENT_DATE;

-- Backfill existing rows
UPDATE public.emotions SET recorded_date = (created_at AT TIME ZONE 'Asia/Seoul')::date;

-- Add UNIQUE constraint
ALTER TABLE public.emotions ADD CONSTRAINT emotions_user_id_recorded_date_key UNIQUE (user_id, recorded_date);

-- Add UPDATE policy so upsert works
CREATE POLICY "Users can update their own emotions"
  ON public.emotions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
