
// ============================================================
// 🔥 CORE-SCRIPTS.JS — VERSIÓN ESTABLE Y FUNCIONAL
// Café Cortero — Autenticación + Sesión + Menú
// ============================================================

// ============================================================
// 🔧 1. CONFIGURACIÓN SUPABASE (FUNCIONA EN GITHUB PAGES)
// ============================================================

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// FIX: GitHub Pages no admite localStorage con OAuth (Safari + Chrome)
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

console.log("🔥 Supabase conectado correctamente (sessionStorage activado)");


// ============================================================
// 🚀 2. VERIFICAR SESIÓN AL CARGAR LA PÁGINA
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
    console.log("🟡 No hay sesión — modo invitado");
    activarModoInvitado();
  }
}


// ============================================================
// 🔔 3. LISTENER — DETECTA LOGIN AUTOMÁTICO DESPUÉS DE GOOGLE
// ============================================================

supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("📌 Evento Auth:", event);

  if (session) {
    console.log("🟢 Usuario logueado:", session.user);
    manejarUsuario(session.user);
  }

  if (event === "SIGNED_OUT") {
    console.log("🔴 Sesión cerrada");
    activarModoInvitado();
  }
});


// ============================================================
// 👤 4. PROCESAR / INSERTAR USUARIO EN BD
// ============================================================

async function manejarUsuario(user) {
  console.log("👤 Procesando usuario:", user);

  // GUARDA O ACTUALIZA usuario en Supabase (tabla usuarios)
  const { error } = await supabaseClient.from("usuarios").upsert({
    id: user.id,
    email: user.email,
    nombre: user.user_metadata.full_name || "",
    avatar: user.user_metadata.avatar_url || "",
    proveedor: user.app_metadata.provider || "google",
    actualizado: new Date()
  });

  if (error) {
    console.error("❌ Error guardando usuario:", error);
  } else {
    console.log("🟢 Usuario guardado/actualizado en BD");
  }

  // Activar menú autenticado
  activarModoAutenticado(user);
}


// ============================================================
// 🟦 5. MENÚ — CAMBIAR ENTRE INVITADO Y AUTENTICADO
// ============================================================

function activarModoInvitado() {
  const userMenu = document.getElementById("menu-usuario");
  const loginBtn = document.getElementById("login-button");

  if (userMenu) userMenu.style.display = "none";
  if (loginBtn) loginBtn.style.display = "block";

  console.log("🟡 Menú en modo invitado");
}

function activarModoAutenticado(user) {
  const userMenu = document.getElementById("menu-usuario");
  const loginBtn = document.getElementById("login-button");

  if (userMenu) userMenu.style.display = "block";
  if (loginBtn) loginBtn.style.display = "none";

  console.log("🟢 Menú autenticado activado");
}


// ============================================================
// 🔚 6. INICIAR VERIFICACIÓN AL CARGAR LA PÁGINA
// ============================================================

verificarSesionInicial();


// ============================================================
// 🔵 7. FUNCIÓN PARA LOGIN CON GOOGLE (para usar en HTML)
// ============================================================

window.loginGoogle = async function () {
  console.log("🚀 Iniciando login con Google...");

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
// 🔴 8. FUNCIÓN PARA CERRAR SESIÓN
// ============================================================

window.logout = async function () {
  await supabaseClient.auth.signOut();
  console.log("🔴 Sesión cerrada");
  activarModoInvitado();
};
