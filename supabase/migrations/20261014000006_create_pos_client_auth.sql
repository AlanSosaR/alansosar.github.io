-- Función definitiva para creación de clientes POS
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
  new_id uuid := gen_random_uuid();
  user_email text;
  result jsonb;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'El nombre es obligatorio';
  END IF;

  user_email := COALESCE(NULLIF(trim(p_email), ''), 'pos_' || replace(new_id::text, '-', '') || '@pos.cafecortero.com');

  -- 1. Insertar en auth.users (evita el envío de correos SMTP y genera la cuenta real de Supabase)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) VALUES (
    new_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    user_email,
    '$2a$10$wK1/vD0H6lRZZgI5N.eE.OIqR5xXqJg41g4L8H4YhK7P8l4n.O8eK',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', trim(p_name), 'phone', nullif(trim(p_phone), '')),
    now(),
    now(),
    false,
    false
  );

  -- 2. Asegurar datos en public.users
  INSERT INTO public.users (
    id,
    name,
    email,
    phone,
    country,
    rol,
    status
  ) VALUES (
    new_id,
    trim(p_name),
    user_email,
    nullif(trim(p_phone), ''),
    'Honduras',
    'usuario',
    'activo'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = COALESCE(EXCLUDED.phone, users.phone);

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
