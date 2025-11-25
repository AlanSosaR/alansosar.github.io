// ============================================================
// 🔥 CORE-SCRIPTS.JS — VERSIÓN FINAL Y ESTABLE
// Café Cortero — Autenticación + Sesión + Menú
// ============================================================

// ============================================================
// 🔧 1. CONFIGURACIÓN SUPABASE
// ============================================================

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// FIX para GitHub Pages y Safari
const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key)
};

// Crear cliente global
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log("🔥 Supabase conectado correctamente");


// ============================================================
// 🚀 2. VERIFICAR SESIÓN AL CARGAR
// ============================================================

async function verificarSesionInicial() {
  console.log("⏳ Verificando sesión inicial...");

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("❌ Error obteniendo sesión:", error);
    return;
  }

  const session = data.session;

  if (session) {
    console.log("🟢 Sesión activa:", session);
    manejarUsuario(session.user);
  } else {
    console.log("🟡 No hay sesión — Modo invitado");
    activarModoInvitado();
  }
}


// ============================================================
// 🔔 3. LISTENER — DETECTA LOGIN / LOGOUT
// ============================================================

supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("📌 Evento Auth:", event);

  if (session) {
    manejarUsuario(session.user);
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

  // 📌 Tabla REAL = users
  const { error } = await supabaseClient.from("users").upsert({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || "",
    phone: user.user_metadata?.phone || "",
    country: "",
    photo_url: user.user_metadata?.avatar_url || "",
    rol: user.app_metadata?.provider || "google",
    updated_at: new Date()
  });

  if (error) {
    console.error("❌ Error guardando usuario:", error);
  } else {
    console.log("🟢 Usuario guardado/actualizado en BD");
  }

  activarModoAutenticado(user);
}


// ============================================================
// 🟦 5. MENÚ — INVITADO / AUTENTICADO
// ============================================================

function activarModoInvitado() {
  const userMenu = document.getElementById("menu-usuario");
  const loginBtn = document.getElementById("login-button");

  if (userMenu) userMenu.style.display = "none";
  if (loginBtn) loginBtn.style.display = "block";

  console.log("🟡 Modo invitado activado");
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
// 🔵 7. FUNCIÓN LOGIN CON GOOGLE
// ============================================================

window.loginGoogle = async function () {
  console.log("🚀 Login con Google...");

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://alansosar.github.io/"
    }
  });

  if (error) {
    console.error("❌ Error en login Google:", error);
  }
};


// ============================================================
// 🔴 8. FUNCIÓN CERRAR SESIÓN
// ============================================================

window.logout = async function () {
  await supabaseClient.auth.signOut();
  console.log("🔴 Sesión cerrada");
  activarModoInvitado();
};
