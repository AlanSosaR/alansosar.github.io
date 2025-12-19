console.log("🧭 header.js activo (versión limpia)");

/* ========================= HELPERS ========================= */
const safe = (id) => document.getElementById(id);

/* ========================= ESPERAR HEADER ========================= */
function waitForHeader() {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      const header = document.getElementById("main-header");
      if (header) {
        clearInterval(interval);
        resolve(header);
      }
    }, 40);
  });
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
document.addEventListener("DOMContentLoaded", async () => {

  /* 🔑 ESPERAR HEADER INYECTADO */
  const header = await waitForHeader();

  const mode       = window.PAGE_MODE || "default";
  const nav        = header.querySelector(".nav-links");
  const cartBtn    = header.querySelector("#cart-btn");
  const menuToggle = header.querySelector("#menu-toggle");
  const titleEl    = header.querySelector("#header-title");
  const sb         = getSupabaseClient();

  /* 🔑 Drawer elements */
  const logoutBtn  = safe("logout-btn");
  const scrim      = safe("user-scrim");

  /* ========================= ESTADO USUARIO ========================= */
  const user = JSON.parse(localStorage.getItem("cortero_user"));

  header.classList.toggle("logged", !!user);
  header.classList.toggle("no-user", !user);

  /* ========================= RESET BASE ========================= */
  nav?.classList.remove("hidden");
  cartBtn?.classList.remove("hidden");
  menuToggle?.classList.remove("hidden");
  titleEl?.classList.add("hidden");

  closeDrawer(); // 🔑 evita drawer abierto al cambiar de página

  /* ========================= MODOS ========================= */
  switch (mode) {

    case "carrito":
      nav?.classList.add("hidden");
      cartBtn?.classList.add("hidden");
      if (titleEl) {
        titleEl.textContent = "Carrito";
        titleEl.classList.remove("hidden");
      }
      break;

    case "recibo":
      nav?.classList.add("hidden");
      cartBtn?.classList.add("hidden");
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

  /* ========================= CARRITO ========================= */
  cartBtn?.addEventListener("click", () => {
    window.location.href = "carrito.html";
  });
  updateCartCount();

  /* ========================= DRAWER ========================= */
  menuToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    openDrawer();
  });

  scrim?.addEventListener("click", closeDrawer);

  document.addEventListener("click", (e) => {
    const avatarBtn = e.target.closest("#btn-header-user");
    if (!avatarBtn) return;
    e.preventDefault();
    e.stopPropagation();
    openDrawer();
  });

  /* ========================= LOGOUT ========================= */
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
