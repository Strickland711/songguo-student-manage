-- Create feedback table for teacher-parent feedback tracking
CREATE TABLE public.feedback_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  student_id UUID NOT NULL,
  feedback_date DATE NOT NULL,
  mood TEXT NOT NULL CHECK (mood IN ('happy', 'neutral', 'sad')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, student_id, feedback_date)
);

-- Enable Row Level Security
ALTER TABLE public.feedback_records ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own feedback records" 
ON public.feedback_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback records" 
ON public.feedback_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback records" 
ON public.feedback_records 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback records" 
ON public.feedback_records 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_feedback_records_updated_at
BEFORE UPDATE ON public.feedback_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();