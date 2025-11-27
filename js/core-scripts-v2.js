// ============================================================
// SUPABASE CLIENT — FIX ESTABLE 2025
// Restauración real de sesión + foto persistente
// ============================================================

const { createClient } = supabase;

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// Sesión para GitHub Pages
const storage = {
  getItem: (k) => sessionStorage.getItem(k),
  setItem: (k, v) => sessionStorage.setItem(k, v),
  removeItem: (k) => sessionStorage.removeItem(k),
};

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage,
    storageKey: "cortero-session"
  }
});

console.log("🔥 Supabase inicializado correctamente");


// ============================================================
// Cargar datos del usuario desde la tabla users
// ============================================================
async function cargarPerfilGlobal(user) {
  if (!user) {
    sessionStorage.removeItem("cortero_user");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
    return;
  }

  const sb = window.supabaseClient;

  const { data: perfil } = await sb
    .from("users")
    .select("id, name, phone, photo_url")
    .eq("id", user.id)
    .single();

  const foto = perfil?.photo_url
    ? perfil.photo_url
    : "imagenes/avatar-default.svg";

  const userData = {
    id: perfil.id,
    name: perfil.name || "Usuario",
    phone: perfil.phone || "",
    photo_url: foto,
  };

  sessionStorage.setItem("cortero_user", JSON.stringify(userData));
  sessionStorage.setItem("cortero_logged", "1");

  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: userData }));
  console.log("🟢 Perfil global cargado:", userData);
}


// ============================================================
// Detectar login / logout
// ============================================================
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 auth event:", event);
  if (session?.user) {
    await cargarPerfilGlobal(session.user);
  } else {
    sessionStorage.removeItem("cortero_logged");
    sessionStorage.removeItem("cortero_user");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});


// ============================================================
// Restaurar sesión al abrir la página
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    await cargarPerfilGlobal(data.session.user);
  } else {
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});
