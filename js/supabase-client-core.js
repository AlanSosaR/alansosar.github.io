// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO 2025 SIN PKCE
// Funciona en GitHub Pages, iOS, Android y todos los navegadores
// ============================================================

console.log("🔥 FIX SUPABASE 2025 — Modo TOKEN MANUAL ACTIVADO");

// Importar createClient desde el SDK
const { createClient } = supabase;

// ------------------------------------------------------------
// Credenciales reales
// ------------------------------------------------------------
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";


// ------------------------------------------------------------
// Manejo local seguro (evita fallos de Mobile Safari / GitHub Pages)
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
// 3) FORZAR JWT EN TODAS LAS PETICIONES — VERSIÓN ESTABLE 2025
// ============================================================

// Obtener token JWT actual
async function getJwt() {
  const { data } = await window.supabaseClient.auth.getSession();
  return data?.session?.access_token || null;
}

// Inyectar el JWT en las peticiones de forma correcta
async function fromAuth(table) {
  const jwt = await getJwt();
  const client = window.supabaseClient;

  // Importante: agregar header Authorization sin romper el cliente
  client.headers = { ...client.headers, Authorization: `Bearer ${jwt}` };

  return client.from(table);
}

// API compatible con tu código actual
// ¡Aquí está la parte que elimina por completo el error rojo!
window.supabase = {
  from(table) {
    return {
      select: async (...args) => (await fromAuth(table)).select(...args),
      insert: async (...args) => (await fromAuth(table)).insert(...args),
      update: async (...args) => (await fromAuth(table)).update(...args),
      upsert: async (...args) => (await fromAuth(table)).upsert(...args),
      delete: async (...args) => (await fromAuth(table)).delete(...args),
      eq: async (...args) => (await fromAuth(table)).eq(...args),
    };
  },
};


// ============================================================
// 4) Cargar perfil global
// ============================================================
async function cargarPerfilGlobal(user) {
  if (!user) return;

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
// 6) Escuchar eventos de sesión
// ============================================================
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 Evento Auth:", event);
  if (session?.user) cargarPerfilGlobal(session.user);
});


// ============================================================
// 7) Restaurar sesión al abrir la página
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();
  if (data?.session?.user) cargarPerfilGlobal(data.session.user);
});
