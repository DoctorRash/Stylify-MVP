-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tailor_id UUID NOT NULL REFERENCES public.tailors(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(order_id, customer_user_id)
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Customers can create reviews for their completed orders"
  ON public.reviews FOR INSERT
  WITH CHECK (
    customer_user_id = auth.uid() AND
    order_id IN (
      SELECT id FROM public.orders 
      WHERE customer_user_id = auth.uid() 
      AND status = 'completed'
    )
  );

CREATE POLICY "Customers can update their own reviews"
  ON public.reviews FOR UPDATE
  USING (customer_user_id = auth.uid());

CREATE POLICY "Customers can delete their own reviews"
  ON public.reviews FOR DELETE
  USING (customer_user_id = auth.uid());

-- Add average_rating column to tailors table
ALTER TABLE public.tailors ADD COLUMN average_rating NUMERIC(3,2) DEFAULT 0;
ALTER TABLE public.tailors ADD COLUMN review_count INTEGER DEFAULT 0;

-- Function to update tailor rating
CREATE OR REPLACE FUNCTION public.update_tailor_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tailors
  SET 
    average_rating = COALESCE((
      SELECT AVG(rating)::NUMERIC(3,2)
      FROM public.reviews
      WHERE tailor_id = COALESCE(NEW.tailor_id, OLD.tailor_id)
    ), 0),
    review_count = COALESCE((
      SELECT COUNT(*)
      FROM public.reviews
      WHERE tailor_id = COALESCE(NEW.tailor_id, OLD.tailor_id)
    ), 0)
  WHERE id = COALESCE(NEW.tailor_id, OLD.tailor_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update rating on review changes
CREATE TRIGGER update_tailor_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_tailor_rating();

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = is_admin.user_id
    AND role = 'admin'
  );
$$;

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin(auth.uid()));
