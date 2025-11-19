// =========================
//  AUTH UI (Supabase + UI)
//  Compatible con modo GLOBAL
// =========================

// Cliente Supabase global
const supabase = window.supabaseClient;

// Funciones auth globales
const { getCurrentUser, logoutUser } = window.supabaseAuth;

/* ============================================================
   CARGA DE USUARIO LOGUEADO + ACTUALIZACIÓN DE UI
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  const user = await getCurrentUser();

  if (!user) {
    showLoggedOutUI();
    return;
  }

  updateUIForUser(user);
});

/* ============================================================
   MOSTRAR HEADER PARA NO LOGUEADOS
   ============================================================ */
function showLoggedOutUI() {
  // Desktop
  document.getElementById("login-desktop").style.display = "inline-block";
  document.getElementById("profile-desktop").style.display = "none";

  // Mobile
  document.getElementById("drawer-links-default").style.display = "flex";
  document.getElementById("drawer-links-logged").style.display = "none";
}

/* ============================================================
   MOSTRAR HEADER PARA USUARIOS LOGUEADOS
   ============================================================ */
function updateUIForUser(user) {
  const name = user.user_metadata?.full_name || "Usuario";
  const photo = user.user_metadata?.photo_url || "imagenes/avatar-default.svg";

  // ========== DESKTOP ==========
  document.getElementById("login-desktop").style.display = "none";

  const desktopProfile = document.getElementById("profile-desktop");
  desktopProfile.style.display = "flex";

  document.getElementById("profile-photo-desktop").src = photo;
  document.getElementById("hello-desktop").textContent = `Hola, ${name}`;

  // Menú flotante escritorio
  desktopProfile.addEventListener("click", () => {
    document.getElementById("profile-menu").classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!desktopProfile.contains(e.target)) {
      document.getElementById("profile-menu").classList.remove("open");
    }
  });

  // ========== MÓVIL ==========
  document.getElementById("drawer-links-default").style.display = "none";
  document.getElementById("drawer-links-logged").style.display = "flex";

  document.getElementById("profile-photo-mobile").src = photo;
  document.getElementById("hello-mobile").textContent = `Hola, ${name}`;

  // ========== LOGOUT ==========
  document.getElementById("logout-desktop").onclick = async (e) => {
    e.preventDefault();
    await logoutUser();
    window.location.reload();
  };

  document.getElementById("logout-mobile").onclick = async (e) => {
    e.preventDefault();
    await logoutUser();
    window.location.reload();
  };
}
