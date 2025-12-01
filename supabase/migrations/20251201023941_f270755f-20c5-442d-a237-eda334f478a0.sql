-- Fix storage policies for tailor-profiles bucket
-- Allow authenticated tailors to upload their profile images

-- Drop existing policies if any
DROP POLICY IF EXISTS "Tailors can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Tailors can update their profile images" ON storage.objects;
DROP POLICY IF EXISTS "Tailors can delete their profile images" ON storage.objects;

-- Allow tailors to upload images to tailor-profiles bucket
CREATE POLICY "Tailors can upload profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tailor-profiles' AND
  auth.uid() IN (SELECT user_id FROM public.tailors)
);

-- Allow anyone to view images in tailor-profiles bucket (public bucket)
CREATE POLICY "Anyone can view profile images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tailor-profiles');

-- Allow tailors to update their own images
CREATE POLICY "Tailors can update their profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tailor-profiles' AND
  auth.uid() IN (SELECT user_id FROM public.tailors)
);

-- Allow tailors to delete their own images
CREATE POLICY "Tailors can delete their profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tailor-profiles' AND
  auth.uid() IN (SELECT user_id FROM public.tailors)
);

-- Add similar policies for tailor-portfolio bucket
DROP POLICY IF EXISTS "Tailors can upload portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Tailors can update portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Tailors can delete portfolio images" ON storage.objects;

CREATE POLICY "Tailors can upload portfolio images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tailor-portfolio' AND
  auth.uid() IN (SELECT user_id FROM public.tailors)
);

CREATE POLICY "Anyone can view portfolio images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tailor-portfolio');

CREATE POLICY "Tailors can update portfolio images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tailor-portfolio' AND
  auth.uid() IN (SELECT user_id FROM public.tailors)
);

CREATE POLICY "Tailors can delete portfolio images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tailor-portfolio' AND
  auth.uid() IN (SELECT user_id FROM public.tailors)
);