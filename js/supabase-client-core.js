// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO 2025
// Funciona en GitHub Pages, iOS, Android, Windows y cualquier navegador
// Sin PKCE — Modo TOKEN MANUAL SEGURO
// ============================================================

console.log("🔥 FIX SUPABASE 2025 — CLIENTE CORE ACTIVADO");

// -------------------------------------------
// 1) Crear cliente oficial Supabase
// -------------------------------------------
const { createClient } = supabase;

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

const storage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch {} }
};

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "cortero.session.v2",
    storage
  }
});

console.log("🟢 Supabase cliente creado correctamente");


// ============================================================
// 2) Obtener JWT actual (para todas las consultas)
// ============================================================
async function getJwt() {
  const { data } = await window.supabaseClient.auth.getSession();
  return data?.session?.access_token || null;
}


// ============================================================
// 3) FORZAR JWT — IMPLEMENTACIÓN ESTABLE (SIN PROMESAS ROTAS)
// ============================================================

async function fromAuth(table) {
  const jwt = await getJwt();
  
  // Inyectamos header Authorization: Bearer XXX
  window.supabaseClient.headers = {
    ...window.supabaseClient.headers,
    Authorization: `Bearer ${jwt}`
  };

  return window.supabaseClient.from(table);
}

// API pública (compatibles con .select, .insert, .update, .delete)
window.supabase = {
  from: (table) => ({
    select: async (...args) => (await fromAuth(table)).select(...args),
    insert: async (...args) => (await fromAuth(table)).insert(...args),
    update: async (...args) => (await fromAuth(table)).update(...args),
    delete: async (...args) => (await fromAuth(table)).delete(...args),
    upsert: async (...args) => (await fromAuth(table)).upsert(...args),
    eq: async (...args) => (await fromAuth(table)).eq(...args),
  }),
};

console.log("🔐 Modo TOKEN MANUAL activo — JWT será inyectado");


// ============================================================
// 4) Cargar perfil real del usuario
// ============================================================
async function cargarPerfilGlobal(user) {
  if (!user) return;

  const jwt = await getJwt();
  console.log("🔑 JWT activo:", jwt ? "OK" : "NO");

  const { data, error } = await window.supabase
    .from("users")
    .select("id,name,phone,email,photo_url")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("❌ Error cargando perfil:", error);
    return;
  }

  const perfil = {
    id: data.id,
    name: data.name || "",
    phone: data.phone || "",
    email: data.email || user.email,
    photo_url: data.photo_url || "imagenes/avatar-default.svg"
  };

  localStorage.setItem("cortero_user", JSON.stringify(perfil));
  localStorage.setItem("cortero_logged", "1");

  console.log("👤 Perfil actualizado:", perfil);
  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: perfil }));
}


// ============================================================
// 5) Logout TOTAL
// ============================================================
async function logoutTotal() {
  console.log("🚪 Cerrando sesión real…");

  await window.supabaseClient.auth.signOut();

  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");
  localStorage.removeItem("cortero.session.v2");

  document.dispatchEvent(new CustomEvent("userLoggedOut"));
}

window.corteroLogout = logoutTotal;


// ============================================================
// 6) Eventos AUTH
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
// 7) Restaurar sesión al abrir cualquier página
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();
  if (data?.session?.user) {
    console.log("♻ Restaurando sesión guardada…");
    await cargarPerfilGlobal(data.session.user);
  } else {
    console.log("🚫 Sin sesión activa");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});
