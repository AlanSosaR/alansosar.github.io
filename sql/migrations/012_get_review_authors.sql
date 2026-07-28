-- Migration: 012_get_review_authors
-- Description: RPC segura para que anónimos puedan leer nombres/fotos de reseñas

CREATE OR REPLACE FUNCTION public.get_review_authors(user_ids UUID[])
RETURNS TABLE(id UUID, name TEXT, photo_url TEXT)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT id, name, photo_url FROM public.users WHERE id = ANY(user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_review_authors TO anon, authenticated;
