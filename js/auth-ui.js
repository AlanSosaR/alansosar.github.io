// ============================================================
// AUTH-UI — Café Cortero (2025)
// Controla SOLO la UI según sesión (NO backend)
// ============================================================

console.log("👤 auth-ui.js activo — versión FINAL ESTABLE");

/* ========================= HELPERS ========================= */
function safe(id) {
  return document.getElementById(id);
}

/* ========================= CIERRE DRAWER ========================= */
function closeDrawerUI() {
  const drawer = safe("user-drawer");
  const scrim = safe("user-scrim");

  if (drawer) {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  if (scrim) {
    scrim.classList.remove("open");
  }

  document.body.style.overflow = "";
}

/* ========================= ESTADO LOGUEADO ========================= */
function setLoggedIn(user) {
  const drawer = safe("user-drawer");
  const header = document.querySelector(".header-fixed");
  if (!drawer) return;

  /* ===== Drawer ===== */
  drawer.classList.remove("no-user");
  drawer.classList.add("logged");

  /* ===== Header desktop ===== */
  if (header) header.classList.add("logged");

  /* ===== Avatar ===== */
  const photo = user?.photo_url || "imagenes/avatar-default.svg";

  if (safe("avatar-user")) {
    safe("avatar-user").src = photo;
  }

  if (safe("avatar-user-drawer")) {
    safe("avatar-user-drawer").src = photo;
  }

  /* ===== Textos drawer ===== */
  if (safe("drawer-name")) {
    safe("drawer-name").textContent = `Hola, ${user?.name || "Usuario"}`;
  }

  if (safe("drawer-email")) {
    safe("drawer-email").textContent = user?.email || "";
  }

  closeDrawerUI();
}

/* ========================= ESTADO INVITADO ========================= */
function setLoggedOut() {
  const drawer = safe("user-drawer");
  const header = document.querySelector(".header-fixed");
  if (!drawer) return;

  /* ===== Drawer ===== */
  drawer.classList.remove("logged");
  drawer.classList.add("no-user");

  /* ===== Header desktop ===== */
  if (header) header.classList.remove("logged");

  closeDrawerUI();
}

/* ========================= INIT ========================= */
document.addEventListener("DOMContentLoaded", () => {
  const raw = localStorage.getItem("cortero_user");

  if (raw) {
    try {
      setLoggedIn(JSON.parse(raw));
    } catch (e) {
      console.warn("⚠️ Usuario inválido, limpiando sesión");
      localStorage.removeItem("cortero_user");
      setLoggedOut();
    }
  } else {
    setLoggedOut();
  }
});

/* ========================= EVENTOS GLOBALES ========================= */
document.addEventListener("userLoggedIn", (e) => {
  setLoggedIn(e.detail);
});

document.addEventListener("userLoggedOut", () => {
  setLoggedOut();
});
