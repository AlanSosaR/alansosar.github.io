// ============================================================
// SUPABASE CLIENT — VERSIÓN FINAL 2025
// Sin PKCE, sin errores rojos, sin SDK duplicado
// Funciona en GitHub Pages, iOS, Android, Windows y todo navegador
// ============================================================

console.log("🔥 SUPABASE CLIENT — Versión FINAL estable 2025");

// ------------------------------------------------------------
// 1) SDK ya cargado desde el HTML
//    (NO se vuelve a cargar aquí para evitar doble SDK)
// ------------------------------------------------------------
const { createClient } = supabase;

// ------------------------------------------------------------
// 2) Credenciales reales
// ------------------------------------------------------------
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ------------------------------------------------------------
// 3) Almacenamiento local seguro
// ------------------------------------------------------------
const storage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch {} }
};

// ------------------------------------------------------------
// 4) Crear cliente Supabase REAL
// ------------------------------------------------------------
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "cortero.session.v2",
    storage
  }
});

// ------------------------------------------------------------
// 5) Proxy seguro que usa SIEMPRE supabaseClient
//    sin romper métodos (.eq, .select, .update)
// ------------------------------------------------------------
window.supabase = {
  from(table) {
    return window.supabaseClient.from(table);
  }
};

// ------------------------------------------------------------
// 6) Cargar perfil global
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

  // Guardar datos localmente
  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");

  console.log("👤 Perfil cargado:", data);

  // Avisar al resto del sistema
  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: data }));
}

// ------------------------------------------------------------
// 7) Logout real
// ------------------------------------------------------------
async function logoutTotal() {
  await window.supabaseClient.auth.signOut();
  localStorage.clear();
  document.dispatchEvent(new CustomEvent("userLoggedOut"));
}
window.corteroLogout = logoutTotal;

// ------------------------------------------------------------
// 8) Escuchar eventos de login/logout
// ------------------------------------------------------------
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
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
// 9) Restauración de sesión al cargar la página
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    cargarPerfilGlobal(data.session.user);
  } else {
    console.log("🚫 No hay sesión activa");
  }
});
