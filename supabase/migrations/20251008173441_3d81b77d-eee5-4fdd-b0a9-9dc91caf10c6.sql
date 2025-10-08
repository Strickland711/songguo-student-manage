-- Add AI feedback fields to tags table
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
ADD COLUMN IF NOT EXISTS use_for_feedback BOOLEAN DEFAULT false;