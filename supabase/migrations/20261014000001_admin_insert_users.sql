-- Permitir a administradores registrar clientes en public.users
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.users ALTER COLUMN country SET DEFAULT 'Honduras';

DROP POLICY IF EXISTS admin_can_insert_users ON public.users;
CREATE POLICY admin_can_insert_users ON public.users
FOR INSERT TO authenticated
WITH CHECK (is_admin());
