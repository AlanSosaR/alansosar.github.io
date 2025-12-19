console.log("🧭 header.js — COMPATIBLE con auth-ui");

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
  if (!drawer) return;

  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  scrim?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  const drawer = $("user-drawer");
  const scrim  = $("user-scrim");
  if (!drawer) return;

  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  scrim?.classList.remove("open");
  document.body.style.overflow = "";
}

function toggleDrawer() {
  const drawer = $("user-drawer");
  if (!drawer) return;
  drawer.classList.contains("open") ? closeDrawer() : openDrawer();
}

/* ========================= INIT ========================= */
document.addEventListener("DOMContentLoaded", () => {

  const header = document.querySelector(".header-fixed");
  if (!header) return;

  const MODE = window.PAGE_MODE || "default";

  const titleEl    = $("header-title");
  const cartBtn    = $("cart-btn");
  const menuToggle = $("menu-toggle");
  const drawer     = $("user-drawer");
  const scrim      = $("user-scrim");

  /* ========================= MODO PÁGINA ========================= */
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

  /* ========================= EVENTOS HEADER ========================= */

  /* Hamburguesa (móvil) */
  menuToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDrawer();
  });

  /* Avatar (desktop) */
  document.addEventListener("click", (e) => {
    const avatarBtn = e.target.closest("#btn-header-user");
    if (!avatarBtn) return;
    e.preventDefault();
    e.stopPropagation();
    toggleDrawer();
  });

  /* Scrim */
  scrim?.addEventListener("click", closeDrawer);

  /* Click fuera */
  document.addEventListener("click", (e) => {
    if (!drawer?.classList.contains("open")) return;
    if (drawer.contains(e.target)) return;
    closeDrawer();
  });

  /* Items del drawer */
  drawer?.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", closeDrawer);
  });

  /* ESC */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  /* ========================= CARRITO ========================= */
  cartBtn?.addEventListener("click", () => {
    window.location.href = "carrito.html";
  });

  updateCartCount();
});
