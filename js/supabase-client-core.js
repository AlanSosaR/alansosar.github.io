// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO 2025
// Persistencia real (localStorage) + Perfil + Eventos correctos
// ============================================================

const { createClient } = supabase;

// ✔ URL REAL
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";

// ✔ ANON KEY (correcta)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ============================================================
//  STORAGE — FIX REAL (iOS + GitHub + Android)
// ============================================================

const storage = {
  getItem: (k) => {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  setItem: (k, v) => {
    try { localStorage.setItem(k, v); } catch {}
  },
  removeItem: (k) => {
    try { localStorage.removeItem(k); } catch {}
  }
};

// ============================================================
//  CREAR CLIENTE SUPABASE (EL FIX MÁS IMPORTANTE)
// ============================================================

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,

    // ❗ FIX: el storageKey DEBE SER ÚNICO
    storageKey: "cortero.session.v2",

    storage
  }
});

console.log("🔥 Supabase inicializado con persistencia REAL v2");


// ============================================================
//  CARGAR PERFIL GLOBAL
// ============================================================

async function cargarPerfilGlobal(user) {
  if (!user) {
    console.log("⚠ No hay usuario, mandando loggedOut");
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
    return;
  }

  const sb = window.supabaseClient;

  const { data: perfil, error } = await sb
    .from("users")
    .select("id, name, phone, photo_url, email")
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

  console.log("🟢 Perfil listo:", userData);

  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: userData }));
}


// ============================================================
//  ESCUCHAR EVENTOS DE AUTH
// ============================================================

window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 Evento de Auth:", event);

  if (session?.user) {
    await cargarPerfilGlobal(session.user);
  } else {
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});


// ============================================================
//  RESTAURAR SESIÓN (AL ABRIR PÁGINA)
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    console.log("♻ Restaurando sesión al cargar...");
    await cargarPerfilGlobal(data.session.user);
  } else {
    console.log("🚪 No hay sesión al cargar");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});
