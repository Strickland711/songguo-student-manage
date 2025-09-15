-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.merge_tags(
  source_tag_id UUID,
  target_tag_id UUID,
  keep_target_data BOOLEAN DEFAULT true
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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