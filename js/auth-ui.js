// ============================================================
// AUTH-UI — Café Cortero (2025)
// UI ONLY — CONTROLADO POR SUPABASE — FINAL ESTABLE
// ============================================================

console.log("👤 auth-ui.js cargado — FINAL SUPABASE");

/* ============================================================
   GUARDIÁN GLOBAL — EVITA DOBLE CARGA
============================================================ */
if (window.__AUTH_UI_LOADED__) {
  console.warn("⚠️ auth-ui.js ya estaba cargado");
  return;
}
window.__AUTH_UI_LOADED__ = true;

/* ========================= HELPERS ========================= */
const $ = (id) => document.getElementById(id);

function isLoginPage() {
  return document.body.dataset.page === "login";
}

/* ============================================================
   ⏳ ESPERAR A SUPABASE (ANTI-RACE CONDITION)
============================================================ */
async function waitForSupabase() {
  if (window.supabase?.auth) return;

  console.warn("⏳ Esperando Supabase...");
  return new Promise(resolve => {
    const i = setInterval(() => {
      if (window.supabase?.auth) {
        clearInterval(i);
        console.log("✅ Supabase listo");
        resolve();
      }
    }, 50);
  });
}

/* ========================= DRAWER ========================= */
function closeDrawerUI() {
  $("user-drawer")?.classList.remove("open");
  $("user-scrim")?.classList.remove("open");
  document.body.style.overflow = "";
}

/* ========================= HEADER LINKS ========================= */
function toggleHeaderLinks(isLogged) {
  $("public-nav")?.classList.toggle("hidden", isLogged);
  $("private-nav")?.classList.toggle("hidden", !isLogged);
}

/* ========================= RESET VISUAL ========================= */
function resetAuthUI() {
  const drawer = $("user-drawer");
  const header = document.querySelector(".header-fixed");

  drawer?.classList.remove("logged");
  drawer?.classList.add("no-user");

  header?.classList.remove("logged");
  header?.classList.add("no-user");

  toggleHeaderLinks(false);
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

  const photo = user?.photo_url || "imagenes/avatar-default.svg";

  $("avatar-user")?.setAttribute("src", photo);
  $("avatar-user-drawer")?.setAttribute("src", photo);

  $("drawer-name") && ($("drawer-name").textContent = user?.name || "Usuario");
  $("drawer-email") && ($("drawer-email").textContent = user?.email || "");

  toggleHeaderLinks(true);
  closeDrawerUI();
}

/* ============================================================
   🔑 SINCRONIZAR SESIÓN INICIAL
============================================================ */
async function syncInitialSession() {
  await waitForSupabase();

  const { data } = await supabase.auth.getSession();

  if (data.session?.user) {
    setLoggedIn({
      email: data.session.user.email,
      name: data.session.user.user_metadata?.name,
      photo_url: data.session.user.user_metadata?.avatar_url
    });

    document.dispatchEvent(new CustomEvent("authStateChanged", {
      detail: { logged: true }
    }));
  } else {
    resetAuthUI();

    document.dispatchEvent(new CustomEvent("authStateChanged", {
      detail: { logged: false }
    }));
  }
}

/* ============================================================
   LOGOUT REAL — SEGURO
============================================================ */
async function hardLogout() {
  await waitForSupabase();

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    console.warn("ℹ️ Logout ignorado (sin sesión)");
    return;
  }

  console.log("🚪 Logout real (Supabase)");
  await supabase.auth.signOut();
}

/* ============================================================
   INIT AUTH UI — LLAMADO DESDE layout.js
============================================================ */
async function initAuthUI() {
  if (window.__AUTH_UI_INIT__) return;
  window.__AUTH_UI_INIT__ = true;

  console.log("👤 initAuthUI ejecutado");

  // ⛔ NO ejecutar en login.html
  if (isLoginPage()) {
    console.warn("⛔ auth-ui deshabilitado en login.html");
    return;
  }

  await syncInitialSession();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      setLoggedIn({
        email: session.user.email,
        name: session.user.user_metadata?.name,
        photo_url: session.user.user_metadata?.avatar_url
      });

      document.dispatchEvent(new CustomEvent("authStateChanged", {
        detail: { logged: true }
      }));
    } else {
      resetAuthUI();

      document.dispatchEvent(new CustomEvent("authStateChanged", {
        detail: { logged: false }
      }));
    }
  });
}

/* ========================= EVENTOS ========================= */
document.addEventListener("userLoggedOut", hardLogout);

/* ============================================================
   EXPORT GLOBAL
============================================================ */
window.initAuthUI = initAuthUI;
