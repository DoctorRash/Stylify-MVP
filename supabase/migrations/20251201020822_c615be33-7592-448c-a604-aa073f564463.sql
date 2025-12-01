-- Create storage buckets for tailor profiles and portfolio
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('tailor-profiles', 'tailor-profiles', true),
  ('tailor-portfolio', 'tailor-portfolio', true);

-- Storage policies for tailor profiles
CREATE POLICY "Anyone can view tailor profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tailor-profiles');

CREATE POLICY "Tailors can upload their own profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tailor-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Tailors can update their own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tailor-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for portfolio
CREATE POLICY "Anyone can view portfolio images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tailor-portfolio');

CREATE POLICY "Tailors can upload their own portfolio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tailor-portfolio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Tailors can delete their own portfolio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tailor-portfolio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create styles table for portfolio items
CREATE TABLE public.styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id UUID NOT NULL REFERENCES public.tailors(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view styles"
ON public.styles FOR SELECT
USING (true);

CREATE POLICY "Tailors can insert their own styles"
ON public.styles FOR INSERT
WITH CHECK (
  tailor_id IN (SELECT id FROM public.tailors WHERE user_id = auth.uid())
);

CREATE POLICY "Tailors can update their own styles"
ON public.styles FOR UPDATE
USING (
  tailor_id IN (SELECT id FROM public.tailors WHERE user_id = auth.uid())
);

CREATE POLICY "Tailors can delete their own styles"
ON public.styles FOR DELETE
USING (
  tailor_id IN (SELECT id FROM public.tailors WHERE user_id = auth.uid())
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id UUID NOT NULL REFERENCES public.tailors(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_user_id UUID REFERENCES public.users(id),
  measurements JSONB,
  photo_urls TEXT[],
  style_id UUID REFERENCES public.styles(id),
  design_image_url TEXT,
  fabric_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tailors can view their own orders"
ON public.orders FOR SELECT
USING (
  tailor_id IN (SELECT id FROM public.tailors WHERE user_id = auth.uid())
);

CREATE POLICY "Customers can view their own orders"
ON public.orders FOR SELECT
USING (
  customer_user_id = auth.uid() OR customer_phone IN (SELECT phone FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Anyone can insert orders"
ON public.orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Tailors can update their orders"
ON public.orders FOR UPDATE
USING (
  tailor_id IN (SELECT id FROM public.tailors WHERE user_id = auth.uid())
);

-- Create tryon_jobs table
CREATE TABLE public.tryon_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  input_payload JSONB NOT NULL,
  output_url TEXT,
  error_msg TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.tryon_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tryon jobs for their orders"
ON public.tryon_jobs FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE customer_user_id = auth.uid() 
    OR tailor_id IN (SELECT id FROM public.tailors WHERE user_id = auth.uid())
  )
);

CREATE POLICY "System can insert tryon jobs"
ON public.tryon_jobs FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update tryon jobs"
ON public.tryon_jobs FOR UPDATE
USING (true);

-- Create function to generate unique slug
CREATE OR REPLACE FUNCTION public.generate_unique_slug(business_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from business name
  base_slug := lower(regexp_replace(business_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- Try to find unique slug
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.tailors WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || floor(random() * 10000)::text;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers
CREATE TRIGGER set_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_tryon_jobs_updated_at
BEFORE UPDATE ON public.tryon_jobs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();