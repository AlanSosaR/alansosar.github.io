// ============================================================
// SUPABASE CLIENT — VERSIÓN FINAL 2025 (CORREGIDO, ESTABLE)
// ============================================================

console.log("🔥 SUPABASE CLIENT — Versión FINAL estable 2025");

// SDK desde HTML
const { createClient } = supabase;

// Credenciales
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// Storage seguro
const storage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch {} }
};

// 🔥 Crear cliente REAL y ÚNICO
window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "cortero.session.v2",
    storage
  }
});

// ------------------------------------------------------------
// Cargar perfil del usuario
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// Logout total
// ------------------------------------------------------------
async function logoutTotal() {
  await window.supabase.auth.signOut();
  localStorage.clear();
  document.dispatchEvent(new CustomEvent("userLoggedOut"));
}
window.corteroLogout = logoutTotal;

// ------------------------------------------------------------
// Eventos de auth
// ------------------------------------------------------------
window.supabase.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 Evento Auth:", event);

  if (session?.user) {
    cargarPerfilGlobal(session.user);
  } else {
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});

// ------------------------------------------------------------
// Restaurar sesión al cargar página
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabase.auth.getSession();

  if (data?.session?.user) {
    cargarPerfilGlobal(data.session.user);
  } else {
    console.log("🚫 No hay sesión activa");
  }
});
