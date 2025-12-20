// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI ONLY — SIN REDIRECCIONES — ANTI LOOP FINAL
// ============================================================

console.log("👤 auth-ui.js cargado — CORE FINAL");

/* ============================================================
   GUARDIÁN GLOBAL — EVITA DOBLE CARGA
============================================================ */
if (window.__AUTH_UI_LOADED__) {
  console.warn("⚠️ auth-ui.js ya estaba cargado");
} else {
  window.__AUTH_UI_LOADED__ = true;
}

/* ========================= HELPERS ========================= */
const $auth = (id) => document.getElementById(id);

/* ========================= DRAWER ========================= */
function closeDrawerUI() {
  $auth("user-drawer")?.classList.remove("open");
  $auth("user-scrim")?.classList.remove("open");
  document.body.style.overflow = "";
}

/* ========================= RESET VISUAL ========================= */
function resetAuthUI() {
  const drawer = $auth("user-drawer");
  const header = document.querySelector(".header-fixed");

  drawer?.classList.remove("logged");
  drawer?.classList.add("no-user");

  header?.classList.remove("logged");
  header?.classList.add("no-user");

  closeDrawerUI();
}

/* ========================= ESTADO LOGUEADO ========================= */
function setLoggedIn(user) {
  resetAuthUI();

  const drawer = $auth("user-drawer");
  const header = document.querySelector(".header-fixed");
  if (!drawer || !header) return;

  drawer.classList.remove("no-user");
  drawer.classList.add("logged");

  header.classList.remove("no-user");
  header.classList.add("logged");

  const photo = user?.photo_url || "imagenes/avatar-default.svg";
  $auth("avatar-user")?.setAttribute("src", photo);
  $auth("avatar-user-drawer")?.setAttribute("src", photo);

  if ($auth("drawer-name")) {
    $auth("drawer-name").textContent = user?.name || "Usuario";
  }
  if ($auth("drawer-email")) {
    $auth("drawer-email").textContent = user?.email || "";
  }

  closeDrawerUI();
}

/* ========================= LOGOUT GLOBAL (UI ONLY) ========================= */
function hardLogout() {
  console.log("🚪 Logout (UI ONLY)");

  // Limpieza de estado
  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");

  resetAuthUI();

  // 🔔 Notificar al sistema (header.js escucha esto)
  document.dispatchEvent(
    new CustomEvent("authStateChanged", {
      detail: { logged: false }
    })
  );

  // ❌ SIN REDIRECCIÓN
}

/* ============================================================
   INIT GLOBAL — LLAMADO SOLO DESDE layout.js
============================================================ */
function initAuthUI() {
  if (window.__AUTH_UI_INIT__) {
    console.warn("⚠️ initAuthUI ya ejecutado");
    return;
  }
  window.__AUTH_UI_INIT__ = true;

  console.log("👤 initAuthUI ejecutado");

  const logged = localStorage.getItem("cortero_logged") === "1";
  const raw    = localStorage.getItem("cortero_user");

  resetAuthUI();

  if (logged && raw) {
    try {
      const user = JSON.parse(raw);
      setLoggedIn(user);

      document.dispatchEvent(
        new CustomEvent("authStateChanged", {
          detail: { logged: true }
        })
      );
    } catch {
      localStorage.removeItem("cortero_user");
      localStorage.removeItem("cortero_logged");
    }
  }
}

/* ========================= EVENTOS ========================= */

// Login exitoso (desde login.js)
document.addEventListener("userLoggedIn", (e) => {
  if (!e.detail) return;

  localStorage.setItem("cortero_logged", "1");
  localStorage.setItem("cortero_user", JSON.stringify(e.detail));

  setLoggedIn(e.detail);

  document.dispatchEvent(
    new CustomEvent("authStateChanged", {
      detail: { logged: true }
    })
  );
});

// Logout desde cualquier parte
document.addEventListener("userLoggedOut", hardLogout);

/* ============================================================
   EXPORT GLOBAL
============================================================ */
window.initAuthUI = initAuthUI;

/* ============================================================
   ⛔ SIN DOMContentLoaded
   layout.js controla el flujo
============================================================ */
