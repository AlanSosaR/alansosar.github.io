// ============================================================
// AUTH-UI — Café Cortero (2025)
// Controla SOLO la UI según sesión
// Compatible con tu HTML actual
// ============================================================

console.log("👤 auth-ui.js activo (versión actual)");

function setLoggedIn(user) {
  const drawer = document.getElementById("user-drawer");
  if (!drawer) return;

  drawer.classList.remove("no-user");
  drawer.classList.add("logged");

  // Avatar header (PC)
  const avatarHeader = document.getElementById("btn-header-user");
  if (avatarHeader) avatarHeader.style.display = "flex";

  // Login desktop
  const loginDesktop = document.getElementById("login-desktop");
  if (loginDesktop) loginDesktop.style.display = "none";

  // Avatar imágenes
  const photo = user?.photo_url || "imagenes/avatar-default.svg";
  const avatarImg = document.getElementById("avatar-user");
  const avatarDrawer = document.getElementById("avatar-user-drawer");

  if (avatarImg) avatarImg.src = photo;
  if (avatarDrawer) avatarDrawer.src = photo;

  // Textos
  if (document.getElementById("drawer-name")) {
    document.getElementById("drawer-name").textContent =
      `Hola, ${user?.name || "Usuario"}`;
  }
  if (document.getElementById("drawer-email")) {
    document.getElementById("drawer-email").textContent =
      user?.email || "";
  }
}

function setLoggedOut() {
  const drawer = document.getElementById("user-drawer");
  if (!drawer) return;

  drawer.classList.remove("logged");
  drawer.classList.add("no-user");

  // Ocultar avatar header
  const avatarHeader = document.getElementById("btn-header-user");
  if (avatarHeader) avatarHeader.style.display = "none";

  // Mostrar login desktop
  const loginDesktop = document.getElementById("login-desktop");
  if (loginDesktop) loginDesktop.style.display = "inline-block";
}

/* ============================================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const raw = localStorage.getItem("cortero_user");

  if (raw) {
    setLoggedIn(JSON.parse(raw));
  } else {
    setLoggedOut();
  }
});

/* ============================================================
   EVENTOS DESDE SUPABASE
============================================================ */
document.addEventListener("userLoggedIn", (e) => {
  setLoggedIn(e.detail);
});

document.addEventListener("userLoggedOut", () => {
  setLoggedOut();
});
