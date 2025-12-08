-- AI Try-On Feature: Create Storage Buckets
-- Run this SQL in Supabase Dashboard → SQL Editor

-- Create customer-photos storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('customer-photos', 'customer-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Create order-references bucket (for style photos)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-references', 'order-references', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for customer-photos
CREATE POLICY "Users can upload their own customer photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'customer-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own customer photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'customer-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own customer photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'customer-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own customer photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'customer-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
