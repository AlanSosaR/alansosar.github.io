// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI ONLY — CONTROLADO POR SUPABASE — FINAL DEFINITIVO
// ============================================================

console.log("👤 auth-ui.js cargado — FINAL SUPABASE");

/* ============================================================
   GUARDIÁN GLOBAL — EVITA DOBLE CARGA
============================================================ */
if (window.__AUTH_UI_LOADED__) {
  console.warn("⚠️ auth-ui.js ya estaba cargado");
} else {
  window.__AUTH_UI_LOADED__ = true;
}

/* ========================= HELPERS ========================= */
const $ = (id) => document.getElementById(id);

/* ========================= DRAWER ========================= */
function closeDrawerUI() {
  $("user-drawer")?.classList.remove("open");
  $("user-scrim")?.classList.remove("open");
  document.body.style.overflow = "";
}

/* ========================= RESET VISUAL ========================= */
function resetAuthUI() {
  const drawer = $("user-drawer");
  const header = document.querySelector(".header-fixed");

  drawer?.classList.remove("logged");
  drawer?.classList.add("no-user");

  header?.classList.remove("logged");
  header?.classList.add("no-user");

  closeDrawerUI();
}

/* ========================= ESTADO LOGUEADO ========================= */
function setLoggedIn(user) {
  const drawer = $("user-drawer");
  const header = document.querySelector(".header-fixed");

  if (!drawer || !header) return;

  drawer.classList.remove("no-user");
  drawer.classList.add("logged");

  header.classList.remove("no-user");
  header.classList.add("logged");

  const photo =
    user?.photo_url ||
    user?.avatar_url ||
    "imagenes/avatar-default.svg";

  $("avatar-user")?.setAttribute("src", photo);
  $("avatar-user-drawer")?.setAttribute("src", photo);

  if ($("drawer-name")) {
    $("drawer-name").textContent = user?.name || "Usuario";
  }

  if ($("drawer-email")) {
    $("drawer-email").textContent = user?.email || "";
  }

  closeDrawerUI();
}

/* ============================================================
   LOGOUT REAL — SUPABASE
============================================================ */
async function hardLogout() {
  console.log("🚪 Logout real (Supabase)");
  await supabase.auth.signOut();
  // Supabase dispara el cambio de estado automáticamente
}

/* ============================================================
   INIT AUTH UI — LLAMADO DESDE layout.js
============================================================ */
function initAuthUI() {
  if (window.__AUTH_UI_INIT__) {
    console.warn("⚠️ initAuthUI ya ejecutado");
    return;
  }
  window.__AUTH_UI_INIT__ = true;

  console.log("👤 initAuthUI ejecutado");

  // Estado inicial: invitado
  resetAuthUI();

  /* ========================================================
     ESCUCHAR SUPABASE (ÚNICA FUENTE DE VERDAD)
  ======================================================== */
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("🔐 Supabase Auth:", event);

    if (session?.user) {
      const user = {
        email: session.user.email,
        name: session.user.user_metadata?.name,
        photo_url: session.user.user_metadata?.avatar_url
      };

      setLoggedIn(user);

      document.dispatchEvent(
        new CustomEvent("authStateChanged", {
          detail: { logged: true }
        })
      );
    } else {
      resetAuthUI();

      document.dispatchEvent(
        new CustomEvent("authStateChanged", {
          detail: { logged: false }
        })
      );
    }
  });
}

/* ========================= EVENTOS ========================= */

// Logout solicitado desde header.js o cualquier parte
document.addEventListener("userLoggedOut", hardLogout);

/* ============================================================
   EXPORT GLOBAL
============================================================ */
window.initAuthUI = initAuthUI;

/* ============================================================
   ⛔ SIN DOMContentLoaded
   layout.js controla el flujo
============================================================ */
