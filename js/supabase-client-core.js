// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO 2025 (SIN SDK DUPLICADO)
// Requiere que el SDK esté cargado en el HTML
// ============================================================

console.log("🔥 FIX SUPABASE 2025 — Modo TOKEN MANUAL ACTIVADO CORRECTO");

// --- IMPORTAR createClient DESDE EL SDK GLOBAL YA CARGADO ---
const { createClient } = window.supabase;

// ------------------------------------------------------------
// Credenciales
// ------------------------------------------------------------
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ------------------------------------------------------------
// Storage seguro
// ------------------------------------------------------------
const storage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch {} }
};

// ------------------------------------------------------------
// Crear cliente Supabase REAL
// ------------------------------------------------------------
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "cortero.session.v2",
    storage
  }
});

// ============================================================
// TOKEN MANUAL AVANZADO
// ============================================================
async function getJwt() {
  const { data } = await window.supabaseClient.auth.getSession();
  return data?.session?.access_token || null;
}

// Proxy universal con token manual
window.corteroDB = {
  from(table) {
    return {
      select: (...args) => inject(table).select(...args),
      update: (...args) => inject(table).update(...args),
      insert: (...args) => inject(table).insert(...args),
      delete: (...args) => inject(table).delete(...args),
      eq: (...args) => inject(table).eq(...args),
    };
  }
};

async function inject(table) {
  const jwt = await getJwt();
  return window.supabaseClient.from(table).withHeaders({
    Authorization: `Bearer ${jwt}`
  });
}

// ============================================================
// Perfil Global
// ============================================================
async function cargarPerfilGlobal(user) {
  if (!user) return;

  const { data, error } = await window.corteroDB
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!error && data) {
    localStorage.setItem("cortero_user", JSON.stringify(data));
    localStorage.setItem("cortero_logged", "1");
    document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: data }));
  }
}

// ============================================================
// Logout real
// ============================================================
async function logoutTotal() {
  await window.supabaseClient.auth.signOut();
  localStorage.clear();
  document.dispatchEvent(new CustomEvent("userLoggedOut"));
}

window.corteroLogout = logoutTotal;

// ============================================================
// Eventos Auth
// ============================================================
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) cargarPerfilGlobal(session.user);
});

// ============================================================
// Restaurar sesión
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();
  if (data?.session?.user) cargarPerfilGlobal(data.session.user);
});
