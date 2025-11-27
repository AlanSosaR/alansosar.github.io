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
// 🟢 SUPABASE AUTH WRAPPER (NECESARIO)
// ============================================================
window.supabaseAuth = {

  // Login con correo/contraseña
  async loginUser(email, password) {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    return { data, error, ok: !error };
  },

  // Cerrar sesión
  async logoutUser() {
    const { error } = await window.supabaseClient.auth.signOut();
    return { ok: !error, error };
  },

  // Obtener usuario actual
  async getCurrentUser() {
    const { data } = await window.supabaseClient.auth.getUser();
    return data?.user || null;
  },

  // Cambiar contraseña
  async changePassword(oldPass, newPass) {
    const user = await this.getCurrentUser();
    if (!user) return { ok: false, error: "No session" };

    // Verificar contraseña antigua
    const { error: loginError } = await window.supabaseClient.auth.signInWithPassword({
      email: user.email,
      password: oldPass
    });

    if (loginError) {
      return { ok: false, error: loginError };
    }

    // Actualizar contraseña
    const { error: updateErr } = await window.supabaseClient.auth.updateUser({
      password: newPass
    });

    return { ok: !updateErr, error: updateErr };
  }
};


// ============================================================
// ⚡ Esperar restauración REAL de sesión (iPhone/Safari)
// ============================================================
window.waitForSupabaseSession = async function () {
  return new Promise((resolve) => {
    let tries = 0;

    const timer = setInterval(async () => {
      tries++;

      const { data } = await window.supabaseClient.auth.getSession();

      if (data?.session?.user) {
        clearInterval(timer);
        resolve(data.session.user);
      }

      if (tries > 30) { // Hasta 3 segundos
        clearInterval(timer);
        resolve(null);
      }
    }, 100);
  });
};


// ============================================================
// 🟢 Cargar datos globales desde tabla users
// ============================================================
async function cargarPerfilGlobal(user) {

  if (!user) {
    sessionStorage.removeItem("cortero_user");
    sessionStorage.removeItem("cortero_logged");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
    return;
  }

  const sb = window.supabaseClient;

  const { data: perfil, error } = await sb
    .from("users")
    .select("id, name, phone, photo_url")
    .eq("id", user.id)
    .single();

  if (error) {
    console.warn("❌ Error cargando perfil global:", error);
    sessionStorage.removeItem("cortero_user");
    return;
  }

  const foto =
    perfil?.photo_url && perfil?.photo_url !== "null"
      ? perfil.photo_url
      : "imagenes/avatar-default.svg";

  const userData = {
    id: perfil.id,
    name: perfil.name || "Usuario",
    phone: perfil.phone || "",
    photo_url: foto,
    email: user.email
  };

  // Guardar en sessionStorage
  sessionStorage.setItem("cortero_user", JSON.stringify(userData));
  sessionStorage.setItem("cortero_logged", "1");

  // Notificar a auth-ui.js
  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: userData }));

  console.log("🟢 Perfil global cargado:", userData);
}


// ============================================================
// 🟡 Detectar login / logout
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
// 🟣 Al abrir página → restaurar sesión REAL
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {

  const user = await window.waitForSupabaseSession();

  if (user) {
    await cargarPerfilGlobal(user);
  } else {
    sessionStorage.removeItem("cortero_user");
    sessionStorage.removeItem("cortero_logged");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});
