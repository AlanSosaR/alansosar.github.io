console.log("🧭 header.js — CORE FINAL CORREGIDO");

/* ========================= HELPERS ========================= */
const $ = (id) => document.getElementById(id);

/* ========================= CARRITO ========================= */
const CART_KEY = "cafecortero_cart";

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

/* ========================= DRAWER ========================= */
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

/* ========================= AUTH UI (ALINEADO A HTML) ========================= */
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

/* ============================================================
   HEADER — INIT
============================================================ */
function initHeader() {
  console.log("✅ initHeader ejecutado");

  const header = document.querySelector(".header-fixed");
  if (!header) return;

  const MODE = window.PAGE_MODE || "default";

  const titleEl    = $("header-title");
  const cartBtn    = $("cart-btn");
  const menuToggle = $("menu-toggle");
  const drawer     = $("user-drawer");
  const scrim      = $("user-scrim");
  const avatarBtn  = $("btn-header-user");
  const logoutBtn  = $("logout-btn");

  /* ========================= MODO LOGIN ========================= */
  if (MODE === "login") {
    cartBtn?.classList.add("hidden");
    menuToggle?.classList.add("hidden");
    avatarBtn?.classList.add("hidden");
    return;
  }

  /* ========================= TÍTULOS ========================= */
  if (MODE === "recibo" || MODE === "carrito") {
    if (titleEl) {
      titleEl.textContent =
        MODE === "recibo" ? "Detalle del pedido" : "Carrito";
      titleEl.classList.remove("hidden");
    }
    cartBtn?.classList.add("hidden");
  }

  /* ========================= EVENTOS ========================= */
  menuToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleDrawer();
  });

  avatarBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleDrawer();
  });

  scrim?.addEventListener("click", closeDrawer);

  document.addEventListener("click", (e) => {
    if (!drawer?.classList.contains("open")) return;
    if (drawer.contains(e.target)) return;
    if (avatarBtn?.contains(e.target)) return;
    if (menuToggle?.contains(e.target)) return;
    closeDrawer();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  drawer?.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", closeDrawer);
  });

  /* ========================= LOGOUT ========================= */
  logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();

    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");

    updateAuthUI(false);
    document.dispatchEvent(new Event("userLoggedOut"));

    closeDrawer();
  });

  /* ========================= CARRITO ========================= */
  cartBtn?.addEventListener("click", () => {
    window.location.href = "carrito.html";
  });

  /* ========================= ESTADO INICIAL ========================= */
  const isLogged = localStorage.getItem("cortero_logged") === "1";
  updateAuthUI(isLogged);
  updateCartCount();
}

/* ========================= AUTH EVENTS ========================= */
document.addEventListener("authStateChanged", (e) => {
  const logged =
    typeof e.detail?.logged === "boolean"
      ? e.detail.logged
      : localStorage.getItem("cortero_logged") === "1";

  updateAuthUI(logged);
  updateCartCount();
  closeDrawer();
});

/* ============================================================
   ⛔ NO AUTO INIT AQUÍ
   layout.js se encarga de llamar initHeader()
============================================================ */
