// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO 2025
// Restauración real + integración con auth-ui
// ============================================================

const { createClient } = supabase;

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// sessionStorage – requerido en GitHub Pages
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

console.log("🔥 Supabase listo (versión final)");


// ============================================================
// FUNCIÓN GLOBAL PARA LOGIN Y PERFIL
// ============================================================
async function cargarPerfilGlobal(user) {
  if (!user) {
    sessionStorage.removeItem("cortero_logged");
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

  const fotoFinal =
    perfil?.photo_url && perfil.photo_url !== "null"
      ? perfil.photo_url
      : "imagenes/avatar-default.svg";

  const userData = {
    id: perfil.id,
    name: perfil.name || "Usuario",
    photo_url: fotoFinal,
  };

  // Guardar sesión interna
  sessionStorage.setItem("cortero_user", JSON.stringify(userData));
  sessionStorage.setItem("cortero_logged", "1");

  // 🔥 Notificar al auth-ui
  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: userData }));

  console.log("🟢 Perfil global cargado:", userData);
}


// ============================================================
// LISTENER DE ESTADO DE AUTENTICACIÓN
// ============================================================
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {

  console.log("🔄 Supabase auth event:", event);

  if (event === "SIGNED_IN" && session?.user) {
    await cargarPerfilGlobal(session.user);
  }

  if (event === "TOKEN_REFRESHED" && session?.user) {
    await cargarPerfilGlobal(session.user);
  }

  if (event === "SIGNED_OUT") {
    sessionStorage.removeItem("cortero_logged");
    sessionStorage.removeItem("cortero_user");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});


// ============================================================
// RESTAURAR SESIÓN AL ABRIR LA PÁGINA
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    await cargarPerfilGlobal(data.session.user);
  } else {
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});


// ============================================================
// FUNCIÓN GLOBAL DE LOGOUT
// ============================================================
window.supabaseAuth = {
  logoutUser: async () => {
    await window.supabaseClient.auth.signOut();
  }
};
