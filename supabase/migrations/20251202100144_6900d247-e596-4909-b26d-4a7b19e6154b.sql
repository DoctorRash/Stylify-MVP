-- Fix search_path for generate_unique_slug function
CREATE OR REPLACE FUNCTION public.generate_unique_slug(business_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix search_path for handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
