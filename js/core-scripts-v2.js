// ============================================================
// 🔥 CORE-SCRIPTS.JS — VERSIÓN FINAL Y ESTABLE
// Café Cortero — Autenticación + Sesión + Menú
// ============================================================

// ============================================================
// 🔧 1. CONFIGURACIÓN SUPABASE (FIJO + TESTEADO)
// ============================================================

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// FIX para GitHub Pages
const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key)
};

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log("🔥 Supabase listo con FIX GitHub Pages");

// ============================================================
// 🚀 2. VERIFICAR SESIÓN INICIAL
// ============================================================

async function verificarSesionInicial() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("❌ Error obteniendo sesión:", error);
    activarModoInvitado();
    return;
  }

  const session = data.session;

  if (session) {
    manejarUsuario(session.user);
  } else {
    activarModoInvitado();
  }
}

// ============================================================
// 🔔 3. LISTENER LOGIN / LOGOUT
// ============================================================

supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("📌 Evento Auth:", event);

  if (session) {
    manejarUsuario(session.user); // aquí ya hay sesión y el correo está confirmado
  }
  if (event === "SIGNED_OUT") {
    activarModoInvitado();
  }
});

// ============================================================
// 👤 4. PROCESAR USUARIO Y GUARDAR EN BD (TABLA users)
// ============================================================

async function manejarUsuario(user) {
  console.log("👤 Procesando usuario:", user);

  const avatarDefault =
    user.user_metadata?.avatar_url ||
    "https://alansosar.github.io/imagenes/avatar-default.svg";

  const now = new Date().toISOString();

  const { error } = await supabaseClient.from("users").upsert({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || "",
    phone: user.user_metadata?.phone || "",
    country: user.user_metadata?.country || "",
    photo_url: avatarDefault,
    rol: user.app_metadata?.provider || "email",
    created_at: now,
    updated_at: now
  });

  if (error) {
    console.error("❌ Error guardando usuario en tabla users:", error);
  } else {
    console.log("🟢 Usuario guardado/actualizado en BD (users)");
  }

  activarModoAutenticado(user);
}

// ============================================================
// 🟦 5. MENÚ
// ============================================================

function activarModoInvitado() {
  const userMenu = document.getElementById("menu-usuario");
  const loginBtn = document.getElementById("login-button");

  if (userMenu) userMenu.style.display = "none";
  if (loginBtn) loginBtn.style.display = "block";

  console.log("🔴 Menú en modo invitado");
}

function activarModoAutenticado(user) {
  const userMenu = document.getElementById("menu-usuario");
  const loginBtn = document.getElementById("login-button");

  if (userMenu) userMenu.style.display = "block";
  if (loginBtn) loginBtn.style.display = "none";

  console.log("🟢 Usuario autenticado — menú actualizado");
}

// ============================================================
// 🔚 6. INICIAR
// ============================================================

verificarSesionInicial();

// ============================================================
// 🔵 7. LOGIN GOOGLE
// ============================================================

window.loginGoogle = async () => {
  console.log("🚀 Login con Google...");
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://alansosar.github.io/"
    }
  });
  if (error) console.error("❌ Error Google:", error);
};

// ============================================================
// 🔴 8. LOGOUT
// ============================================================

window.logout = async () => {
  await supabaseClient.auth.signOut();
  activarModoInvitado();
};
