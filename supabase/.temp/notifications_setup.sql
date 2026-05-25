-- =====================================================
-- CAFÉ CORTERO — SETUP NOTIFICACIONES PUSH
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. HABILITAR RLS EN TABLAS CRÍTICAS
-- (Si ya está habilitado, no dará error)
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR POLÍTICAS ANTIGUAS (si existen) PARA EVITAR CONFLICTOS
DROP POLICY IF EXISTS "push_tokens_all" ON public.push_tokens;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "Permitir upsert de tokens a usuarios autenticados" ON public.push_tokens;
DROP POLICY IF EXISTS "Permitir inserción de notificaciones" ON public.notifications;
DROP POLICY IF EXISTS "Permitir leer notificaciones personales" ON public.notifications;

-- 3. POLÍTICA PARA push_tokens
-- Usuarios autenticados pueden guardar/leer/actualizar su propio token
CREATE POLICY "push_tokens_all"
ON public.push_tokens
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. POLÍTICAS PARA notifications

-- INSERT: Admin puede insertar para cualquier usuario (user_id = null para admins)
-- y usuarios autenticados pueden insertar (para notificar al admin cuando hacen pedido)
CREATE POLICY "notifications_insert"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: Cada usuario ve solo sus notificaciones. Los registros con user_id = null son para admins.
CREATE POLICY "notifications_select"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND rol = 'admin'
    )
  )
);

-- UPDATE: Cada usuario puede marcar sus notificaciones como leídas
CREATE POLICY "notifications_update"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. VERIFICAR ESTRUCTURA DE LA TABLA notifications
-- (solo lectura, para confirmar que las columnas existen)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. VERIFICAR POLÍTICAS CREADAS
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('notifications', 'push_tokens')
ORDER BY tablename, policyname;

-- =====================================================
-- RESULTADO ESPERADO:
-- notifications → 3 políticas (insert, select, update)
-- push_tokens   → 1 política (all)
-- =====================================================
