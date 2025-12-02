// ============================================================
// SUPABASE CLIENT — VERSIÓN FINAL 2025 (ESTABLE + TOKEN MANUAL)
// ============================================================

console.log("🔥 SUPABASE CLIENT — coregido");

// SDK desde HTML
const { createClient } = supabase;

// ------------------------------------------------------------
// Credenciales Supabase
// ------------------------------------------------------------
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ------------------------------------------------------------
// Storage seguro (GitHub Pages / Safari)
// ------------------------------------------------------------
const storage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch {} }
};

// ------------------------------------------------------------
// Cliente REAL Supabase (auth + tokens)
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
// TOKEN MANUAL — (Fix para GitHub Pages + RLS)
// ============================================================

// Obtener JWT actual
async function getJwt() {
  const { data } = await window.supabaseClient.auth.getSession();
  return data?.session?.access_token || null;
}

// Crear wrapper que añade el JWT a cada petición
async function fromAuth(table) {
  const jwt = await getJwt();

  window.supabaseClient.headers = {
    ...window.supabaseClient.headers,
    Authorization: `Bearer ${jwt}`
  };

  return window.supabaseClient.from(table);
}

// API con token manual (compatible con tu código actual)
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
  }
};

// ============================================================
// Cargar perfil global del usuario
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

  // Guardado local
  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");

  console.log("👤 Perfil cargado:", data);

  // Notificar a auth-ui y menú
  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: data }));
}

// ============================================================
// Logout total
// ============================================================
async function logoutTotal() {
  await window.supabaseClient.auth.signOut();
  localStorage.clear();
  document.dispatchEvent(new CustomEvent("userLoggedOut"));
}
window.corteroLogout = logoutTotal;

// ============================================================
// Eventos Auth (cualquier cambio en sesión)
// ============================================================
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 Evento Auth:", event);

  if (session?.user) {
    await cargarPerfilGlobal(session.user);
  } else {
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});

// ============================================================
// Restaurar sesión al abrir cada página
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    console.log("♻ Restaurando sesión...");
    cargarPerfilGlobal(data.session.user);
  } else {
    console.log("🚫 No hay sesión activa");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});
