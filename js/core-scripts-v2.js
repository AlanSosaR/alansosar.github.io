// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO 2025
// Restauración 100% real de sesión + foto persistente
// ============================================================

const { createClient } = supabase;

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// SessionStorage para GitHub Pages
const storage = {
  getItem: (k) => sessionStorage.getItem(k),
  setItem: (k, v) => sessionStorage.setItem(k, v),
  removeItem: (k) => sessionStorage.removeItem(k),
};

// Crear cliente global
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage,
    storageKey: "cortero-session"
  }
});

console.log("🔥 Supabase listo (FIX definitivo)");


// ============================================================
// Cargar datos del usuario desde tabla users
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
    .select("id, name, photo_url")
    .eq("id", user.id)
    .single();

  // Foto final
  const foto = perfil?.photo_url && perfil?.photo_url !== "null"
    ? perfil.photo_url
    : "imagenes/avatar-default.svg";

  const userData = {
    id: perfil.id,
    name: perfil.name || "Usuario",
    photo_url: foto,
  };

  // Guardar globalmente
  sessionStorage.setItem("cortero_user", JSON.stringify(userData));
  sessionStorage.setItem("cortero_logged", "1");

  // Notificar a auth-ui.js
  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: userData }));

  console.log("🟢 Cargado desde BD:", userData);
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
// Al abrir página → restaurar sesión
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {

  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    await cargarPerfilGlobal(data.session.user);
  } else {
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});
