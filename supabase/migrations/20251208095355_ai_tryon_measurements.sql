-- AI Try-On Feature: Add measurement and photo fields
-- Add customer photo and style photo URLs to orders table
-- Add measurement data to tryon_jobs table
-- Create storage bucket for customer photos

-- Add new columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_photo_url TEXT,
ADD COLUMN IF NOT EXISTS style_photo_url TEXT,
ADD COLUMN IF NOT EXISTS measurements_complete BOOLEAN DEFAULT false;

-- Add measurement data to tryon_jobs table
ALTER TABLE public.tryon_jobs
ADD COLUMN IF NOT EXISTS measurement_data JSONB;

-- Create storage bucket for customer photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('customer-photos', 'customer-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for order references (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-references', 'order-references', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for customer photos
-- Users can upload their own photos
CREATE POLICY "Users can upload their own customer photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'customer-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own photos
CREATE POLICY "Users can view their own customer photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'customer-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own photos
CREATE POLICY "Users can update their own customer photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'customer-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own photos
CREATE POLICY "Users can delete their own customer photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'customer-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add comment to document measurement data structure
COMMENT ON COLUMN public.tryon_jobs.measurement_data IS 
'JSONB containing Nigerian tailor measurements in inches: shoulder_width, chest_bust, under_bust, waist, hip, arm_length, arm_width, thigh, knee, full_length_top, full_length_bottom, inside_leg, shoulder_to_nipple, shoulder_to_waist, waist_to_hip, neck_circumference';
