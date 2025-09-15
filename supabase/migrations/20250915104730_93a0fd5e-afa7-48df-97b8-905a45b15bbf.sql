-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable Row Level Security for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create policies for tags
CREATE POLICY "Users can view their own tags" 
ON public.tags 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags" 
ON public.tags 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" 
ON public.tags 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" 
ON public.tags 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create student_tags junction table
CREATE TABLE public.student_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, tag_id)
);

-- Enable Row Level Security for student_tags
ALTER TABLE public.student_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for student_tags - access through student ownership
CREATE POLICY "Users can view student tags for their students" 
ON public.student_tags 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.id = student_tags.student_id 
    AND students.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create student tags for their students" 
ON public.student_tags 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.id = student_tags.student_id 
    AND students.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM tags 
    WHERE tags.id = student_tags.tag_id 
    AND tags.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update student tags for their students" 
ON public.student_tags 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.id = student_tags.student_id 
    AND students.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete student tags for their students" 
ON public.student_tags 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.id = student_tags.student_id 
    AND students.user_id = auth.uid()
  )
);

-- Add trigger for updating timestamps on tags
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function for merging tags
CREATE OR REPLACE FUNCTION public.merge_tags(
  source_tag_id UUID,
  target_tag_id UUID,
  keep_target_data BOOLEAN DEFAULT true
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  source_tag_user_id UUID;
  target_tag_user_id UUID;
BEGIN
  -- Check if both tags belong to the same user
  SELECT user_id INTO source_tag_user_id FROM public.tags WHERE id = source_tag_id;
  SELECT user_id INTO target_tag_user_id FROM public.tags WHERE id = target_tag_id;
  
  IF source_tag_user_id != target_tag_user_id OR source_tag_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized tag merge operation';
  END IF;
  
  -- Move all student_tags from source to target (avoiding duplicates)
  INSERT INTO public.student_tags (student_id, tag_id)
  SELECT DISTINCT st.student_id, target_tag_id
  FROM public.student_tags st
  WHERE st.tag_id = source_tag_id
  AND NOT EXISTS (
    SELECT 1 FROM public.student_tags existing
    WHERE existing.student_id = st.student_id 
    AND existing.tag_id = target_tag_id
  );
  
  -- Update target tag with source data if requested
  IF NOT keep_target_data THEN
    UPDATE public.tags 
    SET 
      name = (SELECT name FROM public.tags WHERE id = source_tag_id),
      color = (SELECT color FROM public.tags WHERE id = source_tag_id),
      description = (SELECT description FROM public.tags WHERE id = source_tag_id)
    WHERE id = target_tag_id;
  END IF;
  
  -- Delete source tag relationships
  DELETE FROM public.student_tags WHERE tag_id = source_tag_id;
  
  -- Delete source tag
  DELETE FROM public.tags WHERE id = source_tag_id;
  
  RETURN TRUE;
END;
$$;