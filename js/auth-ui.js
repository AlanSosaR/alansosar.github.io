// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI ONLY — ESTABLE / SIN LOOP
// ============================================================

console.log("👤 auth-ui.js cargado — CORE FINAL");

/* ========================= HELPERS ========================= */
const $auth = (id) => document.getElementById(id);

/* ========================= RESET VISUAL ========================= */
function resetAuthUI() {
  const drawer = $auth("user-drawer");
  const header = document.querySelector(".header-fixed");

  drawer?.classList.remove("logged");
  drawer?.classList.add("no-user");

  header?.classList.remove("logged");
  header?.classList.add("no-user");
}

/* ========================= ESTADO LOGUEADO ========================= */
function setLoggedIn(user) {
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
}

/* ========================= LOGOUT GLOBAL ========================= */
function hardLogout() {
  console.log("🚪 Logout solicitado");

  // 🔑 SI NO HAY SESIÓN → NO HACER NADA
  if (localStorage.getItem("cortero_logged") !== "1") {
    console.warn("⚠️ Logout ignorado: no hay sesión activa");
    return;
  }

  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");

  resetAuthUI();

  document.dispatchEvent(
    new CustomEvent("authStateChanged", {
      detail: { logged: false }
    })
  );

  // 🔑 REDIRECCIÓN SEGURA (una sola vez)
  if (!window.__LOGOUT_REDIRECTED__) {
    window.__LOGOUT_REDIRECTED__ = true;
    window.location.href = "index.html";
  }
}

/* ============================================================
   INIT GLOBAL — LLAMADO SOLO DESDE layout.js
============================================================ */
function initAuthUI() {
  console.log("👤 initAuthUI ejecutado");

  const logged = localStorage.getItem("cortero_logged") === "1";
  const raw    = localStorage.getItem("cortero_user");

  resetAuthUI();

  if (!logged || !raw) return;

  try {
    const user = JSON.parse(raw);
    setLoggedIn(user);

    document.dispatchEvent(
      new CustomEvent("authStateChanged", {
        detail: { logged: true }
      })
    );
  } catch (err) {
    console.error("❌ Error parseando usuario:", err);
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");
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

// Logout global (disparado por header.js)
document.addEventListener("userLoggedOut", hardLogout);

/* ============================================================
   ⛔ NO DOMContentLoaded
   layout.js controla TODO el flujo
============================================================ */

// 🔑 Export global
window.initAuthUI = initAuthUI;
