-- Create exams table to store exam configurations
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  scores JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exam_results table to store student exam scores
CREATE TABLE public.exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]',
  total_score NUMERIC NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Enable RLS for exams table
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for exams
CREATE POLICY "Users can view their own exams" 
ON public.exams 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exams" 
ON public.exams 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exams" 
ON public.exams 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exams" 
ON public.exams 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable RLS for exam_results table
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for exam_results
CREATE POLICY "Users can view their own exam results" 
ON public.exam_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exam results" 
ON public.exam_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam results" 
ON public.exam_results 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exam results" 
ON public.exam_results 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add update trigger for exams
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add update trigger for exam_results
CREATE TRIGGER update_exam_results_updated_at
BEFORE UPDATE ON public.exam_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();