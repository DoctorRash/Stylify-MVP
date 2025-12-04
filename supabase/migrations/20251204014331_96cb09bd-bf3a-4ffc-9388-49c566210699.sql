-- Fix orders INSERT policy to require authentication
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Authenticated users can insert orders" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (true);

-- Fix tryon_jobs policies to only allow service role access
DROP POLICY IF EXISTS "System can insert tryon jobs" ON public.tryon_jobs;
DROP POLICY IF EXISTS "System can update tryon jobs" ON public.tryon_jobs;

-- Only service role can insert/update tryon_jobs (no policy = deny for regular users)
-- The edge function uses service role key which bypasses RLS

-- Add admin RLS policies for users table
CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT USING (is_admin(auth.uid()));

-- Add admin RLS policies for tailors table  
CREATE POLICY "Admins can view all tailors" ON public.tailors
FOR SELECT USING (is_admin(auth.uid()));

-- Add admin UPDATE policy for tailors (to toggle verified status)
CREATE POLICY "Admins can update all tailors" ON public.tailors
FOR UPDATE USING (is_admin(auth.uid()));

-- Add admin DELETE policy for reviews
CREATE POLICY "Admins can delete reviews" ON public.reviews
FOR DELETE USING (is_admin(auth.uid()));

-- Fix notifications INSERT policy to be more restrictive
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
-- Notifications should only be created via SECURITY DEFINER function (create_notification)
