console.log("🧭 header.js — DEFINITIVO ESTABLE");

/* ========================= HELPERS ========================= */
const $ = (id) => document.getElementById(id);

/* ========================= SUPABASE ========================= */
const sb = window.supabaseClient || null;

/* ========================= CARRITO ========================= */
const CART_KEY = "cafecortero_cart";

function updateCartCount() {
  const badge = $("cart-count");
  if (!badge) return;

  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    badge.textContent = cart.reduce((a, i) => a + i.qty, 0);
  } catch {}
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
  const logoutBtn  = $("logout-btn");

  /* ========================= USUARIO ========================= */
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("cortero_user"));
    } catch {
      return null;
    }
  })();

  header.classList.toggle("logged", !!user);
  header.classList.toggle("no-user", !user);
  drawer?.classList.toggle("logged", !!user);
  drawer?.classList.toggle("no-user", !user);

  /* ========================= AVATAR ========================= */
  if (user) {
    const avatarUrl = user.photo_url || "imagenes/avatar-default.svg";
    $("avatar-user") && ($("avatar-user").src = avatarUrl);
    $("avatar-user-drawer") && ($("avatar-user-drawer").src = avatarUrl);
    $("drawer-name") && ($("drawer-name").textContent = user.nombre || "Usuario");
    $("drawer-email") && ($("drawer-email").textContent = user.email || "");
  }

  /* ========================= MODO RECIBO / CARRITO ========================= */
  if (MODE === "recibo" || MODE === "carrito") {

    if (titleEl) {
      titleEl.textContent = MODE === "recibo"
        ? "Detalle del pedido"
        : "Carrito";
      titleEl.classList.remove("hidden");
    }

    cartBtn?.classList.add("hidden");
  }

  /* ========================= EVENTOS ========================= */

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

  /* Items del menú */
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

  /* ========================= LOGOUT ========================= */
  logoutBtn?.addEventListener("click", async () => {
    try {
      await sb?.auth.signOut();
    } catch {}
    localStorage.removeItem("cortero_user");
    closeDrawer();
    window.location.href = "index.html";
  });

});
