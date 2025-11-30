// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO 2025
// Persistencia real + Perfil + Logout real + Eventos correctos
// ============================================================

console.log("🔥 supabase-client-core.js cargado — versión FINAL 2025");

const { createClient } = supabase;

// ------------------------------------------------------------
// Credenciales reales
// ------------------------------------------------------------
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";


// ------------------------------------------------------------
// Storage seguro (fix GitHub/Android/iOS)
// ------------------------------------------------------------
const storage = {
  getItem: (k) => {
    try { return localStorage.getItem(k); } catch { return null }
  },
  setItem: (k, v) => {
    try { localStorage.setItem(k, v); } catch {}
  },
  removeItem: (k) => {
    try { localStorage.removeItem(k); } catch {}
  }
};


// ------------------------------------------------------------
// Crear cliente Supabase con persistencia real
// ------------------------------------------------------------
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "cortero.session.v2",
    storage
  }
});

console.log("🟢 Supabase inicializado con persistencia REAL");


// ============================================================
// Cargar perfil desde la tabla users
// ============================================================
async function cargarPerfilGlobal(user) {
  if (!user) {
    limpiarSesionLocal();
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
    return;
  }

  const sb = window.supabaseClient;

  const { data: perfil, error } = await sb
    .from("users")
    .select("id, name, phone, email, photo_url")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("❌ Error cargando perfil:", error);
    return;
  }

  const userData = {
    id: perfil.id,
    name: perfil.name || "",
    phone: perfil.phone || "",
    email: perfil.email || user.email,
    photo_url: perfil.photo_url || "imagenes/avatar-default.svg"
  };

  localStorage.setItem("cortero_user", JSON.stringify(userData));
  localStorage.setItem("cortero_logged", "1");

  console.log("👤 Perfil global cargado:", userData);

  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: userData }));
}



// ============================================================
// LOGOUT REAL — LA PIEZA QUE FALTABA
// ============================================================
async function logoutTotal() {
  console.log("🚪 Cerrando sesión REAL en Supabase…");

  try {
    await window.supabaseClient.auth.signOut();
  } catch (e) {
    console.warn("⚠ Supabase signOut error:", e);
  }

  limpiarSesionLocal();

  // Emitir evento global
  document.dispatchEvent(new CustomEvent("userLoggedOut"));
}

function limpiarSesionLocal() {
  console.log("🧹 Limpiando cache y sesión local…");

  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");
  localStorage.removeItem("cortero.session.v2"); // <— storageKey REAL

  // Todas las variaciones posibles
  localStorage.removeItem("sb-session");
  localStorage.removeItem("supabase.auth.token");
  localStorage.removeItem("supabase.auth.token#cortero.session.v2");
}

// Exponer para auth-ui.js
window.corteroLogout = logoutTotal;



// ============================================================
// Escuchar cambios de sesión (login, refresh, logout)
// ============================================================
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 Evento Auth:", event);

  if (session?.user) {
    await cargarPerfilGlobal(session.user);
  } else {
    limpiarSesionLocal();
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});



// ============================================================
// Restaurar sesión al cargar la página
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    console.log("♻ Restaurando sesión al abrir página…");
    await cargarPerfilGlobal(data.session.user);
  } else {
    console.log("🚫 No hay sesión activa");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});
