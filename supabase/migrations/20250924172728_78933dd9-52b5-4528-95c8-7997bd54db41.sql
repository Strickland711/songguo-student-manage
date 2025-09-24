-- Add description column to custom_fields table to store tag options
ALTER TABLE public.custom_fields 
ADD COLUMN description TEXT;