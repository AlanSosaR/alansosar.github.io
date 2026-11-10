-- Función segura para creación de clientes de mostrador / POS
CREATE OR REPLACE FUNCTION public.create_pos_client(
  p_name text,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id uuid;
  result jsonb;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'El nombre es obligatorio';
  END IF;

  INSERT INTO public.users (name, phone, email, country, rol, status)
  VALUES (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_email), ''), 'Honduras', 'usuario', 'activo')
  RETURNING id INTO new_id;

  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'phone', phone,
    'email', email,
    'rol', rol
  ) INTO result
  FROM public.users
  WHERE id = new_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pos_client(text, text, text) TO authenticated, anon, public;
