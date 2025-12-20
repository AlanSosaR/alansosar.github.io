console.log("🧭 header.js — CORE FINAL ESTABLE");

/* =====================================================
   GUARDIÁN GLOBAL — EVITA BUCLES
===================================================== */
if (window.__HEADER_CORE_LOADED__) {
  console.warn("⚠️ header.js ya estaba cargado");
} else {
  window.__HEADER_CORE_LOADED__ = true;
}

/* =====================================================
   HELPERS
===================================================== */
const $ = (id) => document.getElementById(id);
const CART_KEY = "cafecortero_cart";

/* =====================================================
   CARRITO
===================================================== */
function updateCartCount() {
  const badge = $("cart-count");
  if (!badge) return;

  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    badge.textContent = cart.reduce((a, i) => a + i.qty, 0);
  } catch {
    badge.textContent = "0";
  }
}

/* =====================================================
   DRAWER
===================================================== */
function openDrawer() {
  const drawer = $("user-drawer");
  const scrim  = $("user-scrim");
  if (!drawer || !scrim) return;

  drawer.classList.add("open");
  scrim.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  const drawer = $("user-drawer");
  const scrim  = $("user-scrim");
  if (!drawer || !scrim) return;

  drawer.classList.remove("open");
  scrim.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function toggleDrawer() {
  const drawer = $("user-drawer");
  if (!drawer) return;

  drawer.classList.contains("open") ? closeDrawer() : openDrawer();
}

/* =====================================================
   AUTH UI — SOLO CLASES (NO REDIRECCIONES)
===================================================== */
function updateAuthUI(isLogged) {
  const header = document.querySelector(".header-fixed");
  const drawer = $("user-drawer");

  if (isLogged) {
    header?.classList.remove("no-user");
    header?.classList.add("logged");

    drawer?.classList.remove("no-user");
    drawer?.classList.add("logged");
  } else {
    header?.classList.remove("logged");
    header?.classList.add("no-user");

    drawer?.classList.remove("logged");
    drawer?.classList.add("no-user");
  }
}

/* =====================================================
   INIT HEADER — SOLO UNA VEZ
===================================================== */
let HEADER_INITIALIZED = false;

function initHeader() {
  if (HEADER_INITIALIZED) {
    console.warn("⚠️ initHeader ya ejecutado, ignorado");
    return;
  }
  HEADER_INITIALIZED = true;

  console.log("✅ initHeader ejecutado (UNA SOLA VEZ)");

  const cartBtn    = $("cart-btn");
  const menuToggle = $("menu-toggle");
  const avatarBtn  = $("btn-header-user");
  const logoutBtn  = $("logout-btn");
  const drawer     = $("user-drawer");
  const scrim      = $("user-scrim");

  /* ================= EVENTOS LOCALES ================= */

  menuToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleDrawer();
  });

  avatarBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleDrawer();
  });

  scrim?.addEventListener("click", closeDrawer);

  drawer?.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", closeDrawer);
  });

  logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();

    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");

    updateAuthUI(false);
    document.dispatchEvent(new Event("userLoggedOut"));

    closeDrawer();
  });

  cartBtn?.addEventListener("click", () => {
    window.location.href = "carrito.html";
  });

  /* ================= ESTADO INICIAL ================= */

  const isLogged = localStorage.getItem("cortero_logged") === "1";
  updateAuthUI(isLogged);
  updateCartCount();
}

/* =====================================================
   EVENTOS GLOBALES — REGISTRADOS UNA VEZ
===================================================== */
if (!window.__HEADER_GLOBAL_EVENTS__) {
  window.__HEADER_GLOBAL_EVENTS__ = true;

  document.addEventListener("authStateChanged", (e) => {
    const logged =
      typeof e.detail?.logged === "boolean"
        ? e.detail.logged
        : localStorage.getItem("cortero_logged") === "1";

    updateAuthUI(logged);
    updateCartCount();
    closeDrawer();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  document.addEventListener("click", (e) => {
    const drawer = $("user-drawer");
    if (!drawer?.classList.contains("open")) return;

    if (drawer.contains(e.target)) return;
    if ($("btn-header-user")?.contains(e.target)) return;
    if ($("menu-toggle")?.contains(e.target)) return;

    closeDrawer();
  });
}

/* =====================================================
   EXPORT GLOBAL
===================================================== */
window.initHeader = initHeader;
