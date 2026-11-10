// Script para crear el Database Webhook en Supabase via Management API
// Ejecutar con: node supabase/.temp/create_webhook.js

const SUPABASE_PROJECT_REF = "eaipcuvvddyrqkbmjmvw";
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

// ⚠️ REEMPLAZA ESTO con tu Service Role Key (la encuentras en Supabase Dashboard > Settings > API)
// NO la confundas con la anon key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "REEMPLAZA_CON_TU_SERVICE_ROLE_KEY";

async function runSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  return { status: response.status, body: await response.text() };
}

// SQL para las políticas RLS
const SQL_RLS = `
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_all" ON public.push_tokens;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;

CREATE POLICY "push_tokens_all"
ON public.push_tokens FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_insert"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "notifications_select"
ON public.notifications FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (user_id IS NULL AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND rol = 'admin'
  ))
);

CREATE POLICY "notifications_update"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
`;

// Verificar si el token de servicio está configurado
async function main() {
  if (SUPABASE_SERVICE_ROLE_KEY === "REEMPLAZA_CON_TU_SERVICE_ROLE_KEY") {
    console.log("⚠️  INSTRUCCIONES:");
    console.log("1. Ve a: https://supabase.com/dashboard/project/eaipcuvvddyrqkbmjmvw/settings/api");
    console.log("2. Copia la 'service_role' key (la clave secreta)");
    console.log("3. Ejecuta: $env:SUPABASE_SERVICE_ROLE_KEY='TU_KEY' y luego vuelve a correr este script");
    console.log("\nO bien ejecuta directamente el archivo SQL en el Dashboard de Supabase:");
    console.log("https://supabase.com/dashboard/project/eaipcuvvddyrqkbmjmvw/sql/new");
    console.log("\nCopia y pega el contenido de: supabase/.temp/notifications_setup.sql");
    return;
  }
  
  console.log("🔧 Ejecutando SQL de políticas RLS...");
  const result = await runSQL(SQL_RLS);
  console.log("Result:", result.status, result.body);
}

main().catch(console.error);
