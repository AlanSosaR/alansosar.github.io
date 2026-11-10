-- Permitir explícitamente a los administradores insertar pedidos en public.orders
DROP POLICY IF EXISTS "Admins can insert any order" ON public.orders;
CREATE POLICY "Admins can insert any order" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (is_admin());
