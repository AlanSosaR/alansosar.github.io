console.log("🧭 header.js activo — FINAL FUNCIONAL");

/* ========================= HELPERS ========================= */
const safe = (id) => document.getElementById(id);

/* ========================= SUPABASE ========================= */
function getSupabaseClient() {
  return window.supabaseClient || null;
}

/* ========================= CARRITO ========================= */
const CART_KEY = "cafecortero_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function updateCartCount() {
  const badge = safe("cart-count");
  if (!badge) return;

  const total = getCart().reduce((a, i) => a + i.qty, 0);
  badge.textContent = total;
}

/* ========================= DRAWER ========================= */
function openDrawer() {
  const drawer = safe("user-drawer");
  const scrim  = safe("user-scrim");
  if (!drawer) return;

  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  scrim?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  const drawer = safe("user-drawer");
  const scrim  = safe("user-scrim");
  if (!drawer) return;

  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  scrim?.classList.remove("open");
  document.body.style.overflow = "";
}

function toggleDrawer() {
  const drawer = safe("user-drawer");
  if (!drawer) return;

  drawer.classList.contains("open")
    ? closeDrawer()
    : openDrawer();
}

/* ========================= INIT ========================= */
document.addEventListener("DOMContentLoaded", () => {

  /* 🔑 NO BLOQUEAMOS: solo verificamos que exista */
  const header = document.querySelector(".header-fixed");
  if (!header) return;

  const mode       = window.PAGE_MODE || "default";
  const nav        = header.querySelector(".nav-links");
  const cartBtn    = header.querySelector("#cart-btn");
  const menuToggle = header.querySelector("#menu-toggle");
  const titleEl    = header.querySelector("#header-title");

  const drawer     = safe("user-drawer");
  const scrim      = safe("user-scrim");
  const logoutBtn  = safe("logout-btn");

  const sb = getSupabaseClient();

  /* ========================= USUARIO ========================= */
  const user = JSON.parse(localStorage.getItem("cortero_user"));

  header.classList.toggle("logged", !!user);
  header.classList.toggle("no-user", !user);
  drawer?.classList.toggle("logged", !!user);
  drawer?.classList.toggle("no-user", !user);

  /* ========================= AVATAR ========================= */
  if (user) {
    const avatarHeader = safe("avatar-user");
    const avatarDrawer = safe("avatar-user-drawer");

    const avatarUrl = user.photo_url || "imagenes/avatar-default.svg";

    if (avatarHeader) avatarHeader.src = avatarUrl;
    if (avatarDrawer) avatarDrawer.src = avatarUrl;

    safe("drawer-name") && (safe("drawer-name").textContent = user.nombre || "Usuario");
    safe("drawer-email") && (safe("drawer-email").textContent = user.email || "");
  }

  /* ========================= RESET BASE ========================= */
  nav?.classList.remove("hidden");
  cartBtn?.classList.remove("hidden");
  menuToggle?.classList.remove("hidden");
  titleEl?.classList.add("hidden");

  closeDrawer();

  /* ========================= MODOS ========================= */
  if (mode === "carrito" || mode === "recibo") {
    nav?.classList.add("hidden");
    cartBtn?.classList.add("hidden");
    titleEl.textContent = mode === "carrito"
      ? "Carrito"
      : "Detalle del pedido";
    titleEl.classList.remove("hidden");
  }

  if (mode === "login") {
    nav?.classList.add("hidden");
    cartBtn?.classList.add("hidden");
    menuToggle?.classList.add("hidden");
  }

  /* ========================= EVENTOS ========================= */

  /* Abrir / cerrar */
  menuToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDrawer();
  });

  document.addEventListener("click", (e) => {
    const avatarBtn = e.target.closest("#btn-header-user");
    if (!avatarBtn) return;
    e.preventDefault();
    e.stopPropagation();
    toggleDrawer();
  });

  /* Cerrar al tocar scrim */
  scrim?.addEventListener("click", closeDrawer);

  /* Cerrar al tocar fuera */
  document.addEventListener("click", (e) => {
    if (!drawer || !drawer.classList.contains("open")) return;
    if (drawer.contains(e.target)) return;
    closeDrawer();
  });

  /* Cerrar al elegir item */
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
