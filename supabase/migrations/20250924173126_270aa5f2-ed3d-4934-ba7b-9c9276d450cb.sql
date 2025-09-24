-- Update the type constraint to include 'options' for tag generator
ALTER TABLE public.custom_fields 
DROP CONSTRAINT IF EXISTS custom_fields_type_check;

ALTER TABLE public.custom_fields 
ADD CONSTRAINT custom_fields_type_check 
CHECK (type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'email'::text, 'options'::text]));