-- Add class_mappings field to tags table to store which classes this tag applies to
ALTER TABLE public.tags 
ADD COLUMN class_mappings text[] DEFAULT '{}';

COMMENT ON COLUMN public.tags.class_mappings IS 'Array of class names that this tag is associated with';