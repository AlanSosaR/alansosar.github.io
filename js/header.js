console.log("🧭 header.js activo");

/* ========================= HELPERS ========================= */
function safe(id) {
  return document.getElementById(id);
}

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

  const total = getCart().reduce((acc, item) => acc + item.qty, 0);
  badge.textContent = total;
}

/* ========================= DRAWER ========================= */

function openDrawer() {
  safe("user-drawer")?.classList.add("open");
  safe("user-scrim")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  safe("user-drawer")?.classList.remove("open");
  safe("user-scrim")?.classList.remove("open");
  document.body.style.overflow = "";
}

/* ========================= INIT ========================= */

document.addEventListener("DOMContentLoaded", () => {

  const mode       = window.PAGE_MODE || "default";
  const nav        = document.querySelector(".header-nav");
  const cartBtn    = safe("cart-btn");
  const menuToggle = safe("menu-toggle");
  const titleEl    = safe("header-title");
  const logoutBtn  = safe("logout-btn");
  const sb         = getSupabaseClient();

  /* ---------- RESET HEADER ---------- */
  nav?.classList.remove("hidden");
  cartBtn?.classList.remove("hidden");
  menuToggle?.classList.remove("hidden");
  titleEl?.classList.add("hidden");

  /* ---------- MODOS ---------- */
  switch (mode) {

    case "carrito":
      nav?.classList.add("hidden");
      if (titleEl) {
        titleEl.textContent = "Carrito";
        titleEl.classList.remove("hidden");
      }
      break;

    case "recibo":
  // Ocultamos navegación y carrito
  nav?.classList.add("hidden");
  cartBtn?.classList.add("hidden");

  // 🔑 IMPORTANTE:
  // NO ocultar el botón hamburguesa ni el avatar
  // para que el drawer siga funcionando

  if (titleEl) {
    titleEl.textContent = "Detalle del pedido";
    titleEl.classList.remove("hidden");
  }
  break;

    case "login":
      nav?.classList.add("hidden");
      cartBtn?.classList.add("hidden");
      menuToggle?.classList.add("hidden");
      break;
  }

  /* ---------- CARRITO ---------- */
  cartBtn?.addEventListener("click", () => {
    window.location.href = "carrito.html";
  });
  updateCartCount();

  /* ---------- MENÚ / DRAWER ---------- */
  menuToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    openDrawer();
  });

  safe("user-scrim")?.addEventListener("click", closeDrawer);

  document.addEventListener("click", (e) => {
    const avatarBtn = e.target.closest("#btn-header-user");
    if (!avatarBtn) return;
    e.preventDefault();
    e.stopPropagation();
    openDrawer();
  });

  /* ---------- LOGOUT ---------- */
  logoutBtn?.addEventListener("click", async () => {
    try {
      await sb?.auth.signOut();
    } catch (e) {
      console.warn("Logout error:", e);
    }

    localStorage.removeItem("cortero_user");
    closeDrawer();
    window.location.href = "index.html";
  });
});
