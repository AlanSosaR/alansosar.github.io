console.log("🧭 header.js — CORE FINAL");

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

/* ============================================================
   HEADER — INIT (LLAMAR DESPUÉS DE INYECTAR HEADER)
============================================================ */
function initHeader() {
  console.log("✅ initHeader ejecutado");

  const header = document.querySelector(".header-fixed");
  if (!header) {
    console.warn("⚠️ Header no encontrado");
    return;
  }

  const MODE = window.PAGE_MODE || "default";

  const titleEl    = $("header-title");
  const cartBtn    = $("cart-btn");
  const menuToggle = $("menu-toggle");
  const drawer     = $("user-drawer");
  const scrim      = $("user-scrim");
  const avatarBtn  = $("btn-header-user");
  const logoutBtn  = $("logout-btn");

  /* ========================= MODO DE PÁGINA ========================= */
  if (MODE === "recibo" || MODE === "carrito") {
    if (titleEl) {
      titleEl.textContent =
        MODE === "recibo" ? "Detalle del pedido" : "Carrito";
      titleEl.classList.remove("hidden");
    }
    cartBtn?.classList.add("hidden");
  }

  if (MODE === "login") {
    cartBtn?.classList.add("hidden");
    menuToggle?.classList.add("hidden");
  }

  /* ========================= EVENTOS ========================= */

  // Hamburguesa (móvil)
  menuToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleDrawer();
  });

  // Avatar (desktop y móvil)
  avatarBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleDrawer();
  });

  // Scrim
  scrim?.addEventListener("click", closeDrawer);

  // Click fuera del drawer
  document.addEventListener("click", (e) => {
    if (!drawer?.classList.contains("open")) return;
    if (drawer.contains(e.target)) return;
    if (avatarBtn && avatarBtn.contains(e.target)) return;
    if (menuToggle && menuToggle.contains(e.target)) return;
    closeDrawer();
  });

  // Click en items del drawer
  drawer?.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", closeDrawer);
  });

  // ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  /* ========================= LOGOUT (REAL) ========================= */
  logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();

    // 🔑 LIMPIEZA TOTAL DE SESIÓN
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");
    localStorage.removeItem("cafecortero_cart");

    // 🔑 Evento global (auth-ui.js lo escucha)
    document.dispatchEvent(new Event("userLoggedOut"));

    // Cierra drawer
    closeDrawer();

    // 🔑 Redirección limpia (NO vuelve atrás)
    window.location.replace("index.html");
  });

  /* ========================= CARRITO ========================= */
  cartBtn?.addEventListener("click", () => {
    window.location.href = "carrito.html";
  });

  updateCartCount();
}
