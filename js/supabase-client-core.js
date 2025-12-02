// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO SIN PKCE
// Funciona en GitHub Pages, iOS, Android y cualquier navegador
// ============================================================

console.log("🔥 FIX SUPABASE 2025 — Modo TOKEN MANUAL ACTIVADO");

const { createClient } = supabase;

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ============================================================
// 1) Manejo local seguro
// ============================================================
const storage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch {} }
};

// ============================================================
// 2) Crear cliente Supabase
// ============================================================
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "cortero.session.v2",
    storage
  }
});

// ============================================================
// 3) FORZAR JWT EN TODAS LAS PETICIONES
//    (Bypass completo del fallo de cookies/PKCE)
// ============================================================
async function getJwt() {
  const { data } = await window.supabaseClient.auth.getSession();
  return data?.session?.access_token || null;
}

// Proxy que mete el header Authorization: Bearer XXX
window.supabase = {
  from(table) {
    return {
      select: (...args) => injectAuth(table).select(...args),
      update: (...args) => injectAuth(table).update(...args),
      insert: (...args) => injectAuth(table).insert(...args),
      delete: (...args) => injectAuth(table).delete(...args),
      upsert: (...args) => injectAuth(table).upsert(...args),
      eq: (...args) => injectAuth(table).eq(...args),
    };
  }
};

async function injectAuth(table) {
  const jwt = await getJwt();

  return window.supabaseClient.from(table).withHeaders({
    Authorization: `Bearer ${jwt}`
  });
}

// ============================================================
// 4) Cargar perfil real desde DB
// ============================================================
async function cargarPerfilGlobal(user) {
  if (!user) return;

  const jwt = await getJwt();
  console.log("🔑 JWT activo:", jwt ? "OK" : "NO");

  const { data, error } = await window.supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("❌ Error cargando perfil:", error);
    return;
  }

  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");

  console.log("👤 Perfil cargado:", data);
  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: data }));
}

// ============================================================
// 5) Logout real
// ============================================================
async function logoutTotal() {
  await window.supabaseClient.auth.signOut();
  localStorage.clear();
  document.dispatchEvent(new CustomEvent("userLoggedOut"));
}

window.corteroLogout = logoutTotal;

// ============================================================
// 6) Eventos Auth
// ============================================================
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 Evento Auth:", event);
  if (session?.user) cargarPerfilGlobal(session.user);
});

// ============================================================
// 7) Restaurar sesión
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();
  if (data?.session?.user) cargarPerfilGlobal(data.session.user);
});
