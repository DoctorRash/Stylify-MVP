-- Allow anyone to view all tailors (not just verified ones)
DROP POLICY IF EXISTS "Anyone can view verified tailors" ON public.tailors;
CREATE POLICY "Anyone can view all tailors" ON public.tailors
FOR SELECT USING (true);
