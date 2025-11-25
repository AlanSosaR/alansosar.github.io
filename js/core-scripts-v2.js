// ============================================================
// 🔥 CORE-SCRIPTS-V2 — Café Cortero
// Autenticación + Menú + Perfil + Drawer
// FULL COMPATIBLE con tu index actual
// ============================================================

console.log("🔥 core-scripts-v2.js cargado correctamente");

// ------------------------------------------------------------
// 1. Crear cliente Supabase global
// ------------------------------------------------------------
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// FIX para GitHub Pages (sessionStorage)
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

// ------------------------------------------------------------
// 2. ELEMENTOS DEL DOM
// ------------------------------------------------------------
const loginDesktop = document.getElementById("login-desktop");
const profileDesktop = document.getElementById("profile-desktop");
const profileMenu = document.getElementById("profile-menu");
const profilePhotoDesktop = document.getElementById("profile-photo-desktop");
const helloDesktop = document.getElementById("hello-desktop");

// Drawer móvil
const drawerDefault = document.getElementById("drawer-links-default");
const drawerLogged = document.getElementById("drawer-links-logged");
const helloMobile = document.getElementById("hello-mobile");
const profilePhotoMobile = document.getElementById("profile-photo-mobile");


// ------------------------------------------------------------
// 3. MODO INVITADO
// ------------------------------------------------------------
function activarModoInvitado() {
  if (loginDesktop) loginDesktop.style.display = "inline-block";
  if (profileDesktop) profileDesktop.style.display = "none";

  if (drawerDefault) drawerDefault.style.display = "block";
  if (drawerLogged) drawerLogged.style.display = "none";

  console.log("🔴 Modo invitado activado");
}


// ------------------------------------------------------------
// 4. MODO AUTENTICADO
// ------------------------------------------------------------
function activarModoAutenticado(user) {
  console.log("🟢 Activando modo autenticado:", user);

  // Datos
  const nombre = user.user_metadata?.full_name || "Usuario";
  const foto =
    user.user_metadata?.avatar_url ||
    "https://alansosar.github.io/imagenes/avatar-default.svg";

  // --- Escritorio ---
  if (loginDesktop) loginDesktop.style.display = "none";
  if (profileDesktop) profileDesktop.style.display = "inline-block";

  if (helloDesktop) helloDesktop.textContent = `Hola, ${nombre}`;
  if (profilePhotoDesktop) profilePhotoDesktop.src = foto;

  // --- Móvil ---
  if (drawerDefault) drawerDefault.style.display = "none";
  if (drawerLogged) drawerLogged.style.display = "block";

  if (helloMobile) helloMobile.textContent = `Hola, ${nombre}`;
  if (profilePhotoMobile) profilePhotoMobile.src = foto;

  console.log("🟢 Menú actualizado a modo autenticado");
}


// ------------------------------------------------------------
// 5. PROCESAR SESIÓN
// ------------------------------------------------------------
async function verificarSesionInicial() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("❌ Error obteniendo sesión:", error);
    activarModoInvitado();
    return;
  }

  if (data.session?.user) {
    activarModoAutenticado(data.session.user);
  } else {
    activarModoInvitado();
  }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("📌 Auth event:", event);

  if (session?.user) {
    activarModoAutenticado(session.user);
  }
  if (event === "SIGNED_OUT") {
    activarModoInvitado();
  }
});


// ------------------------------------------------------------
// 6. LOGOUT (Desktop + Mobile)
// ------------------------------------------------------------
document.addEventListener("click", (e) => {
  if (e.target.id === "logout-desktop" || e.target.id === "logout-mobile") {
    supabaseClient.auth.signOut();
    activarModoInvitado();
  }
});


// ------------------------------------------------------------
// 7. MOSTRAR / OCULTAR MENÚ DEL PERFIL (desktop)
// ------------------------------------------------------------
if (profileDesktop) {
  profileDesktop.addEventListener("click", () => {
    profileMenu.classList.toggle("open");
  });
}

document.addEventListener("click", (e) => {
  if (!profileDesktop.contains(e.target)) {
    profileMenu.classList.remove("open");
  }
});


// ------------------------------------------------------------
// 8. Iniciar
// ------------------------------------------------------------
verificarSesionInicial();
