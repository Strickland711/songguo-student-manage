-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom_fields table  
CREATE TABLE public.custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'email')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_field_values table for dynamic field data
CREATE TABLE public.student_field_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, field_id)
);

-- Create scoring_records table for scoring system data
CREATE TABLE public.scoring_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for students
CREATE POLICY "Users can view their own students" 
ON public.students 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own students" 
ON public.students 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own students" 
ON public.students 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own students" 
ON public.students 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for custom_fields
CREATE POLICY "Users can view their own custom fields" 
ON public.custom_fields 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom fields" 
ON public.custom_fields 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom fields" 
ON public.custom_fields 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom fields" 
ON public.custom_fields 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for student_field_values
CREATE POLICY "Users can view student field values for their students" 
ON public.student_field_values 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.students 
  WHERE students.id = student_field_values.student_id 
  AND students.user_id = auth.uid()
));

CREATE POLICY "Users can create student field values for their students" 
ON public.student_field_values 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.students 
  WHERE students.id = student_field_values.student_id 
  AND students.user_id = auth.uid()
));

CREATE POLICY "Users can update student field values for their students" 
ON public.student_field_values 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.students 
  WHERE students.id = student_field_values.student_id 
  AND students.user_id = auth.uid()
));

CREATE POLICY "Users can delete student field values for their students" 
ON public.student_field_values 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.students 
  WHERE students.id = student_field_values.student_id 
  AND students.user_id = auth.uid()
));

-- Create RLS policies for scoring_records
CREATE POLICY "Users can view their own scoring records" 
ON public.scoring_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scoring records" 
ON public.scoring_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scoring records" 
ON public.scoring_records 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scoring records" 
ON public.scoring_records 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create updated_at trigger for students
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for student_field_values
CREATE TRIGGER update_student_field_values_updated_at
BEFORE UPDATE ON public.student_field_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();