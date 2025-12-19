console.log("🧭 header.js activo (VERSIÓN FINAL ESTABLE)");

/* ========================= HELPERS ========================= */
const safe = (id) => document.getElementById(id);

/* ========================= ESPERAR HEADER ========================= */
function waitForHeader() {
  return new Promise(resolve => {
    const i = setInterval(() => {
      const header = document.getElementById("main-header");
      if (header) {
        clearInterval(i);
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

  const total = getCart().reduce((a, i) => a + i.qty, 0);
  badge.textContent = total;
}

/* ========================= DRAWER ========================= */
function openDrawer() {
  const drawer = safe("user-drawer");
  const scrim  = safe("user-scrim");
  if (!drawer || drawer.classList.contains("open")) return;

  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  scrim?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  const drawer = safe("user-drawer");
  const scrim  = safe("user-scrim");
  if (!drawer || !drawer.classList.contains("open")) return;

  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  scrim?.classList.remove("open");
  document.body.style.overflow = "";
}

function toggleDrawer() {
  const drawer = safe("user-drawer");
  if (!drawer) return;
  drawer.classList.contains("open") ? closeDrawer() : openDrawer();
}

/* ========================= INIT ========================= */
document.addEventListener("DOMContentLoaded", async () => {

  /* 🔑 Solo actúa si existe el header nuevo */
  const header = await waitForHeader();

  const mode       = window.PAGE_MODE || "default";
  const nav        = header.querySelector(".nav-links");
  const cartBtn    = header.querySelector("#cart-btn");
  const menuToggle = header.querySelector("#menu-toggle");
  const titleEl    = header.querySelector("#header-title");

  const drawer     = safe("user-drawer");
  const scrim      = safe("user-scrim");
  const logoutBtn  = safe("logout-btn");

  const sb         = getSupabaseClient();

  /* ========================= USUARIO ========================= */
  const user = JSON.parse(localStorage.getItem("cortero_user"));

  header.classList.toggle("logged", !!user);
  header.classList.toggle("no-user", !user);
  drawer?.classList.toggle("logged", !!user);
  drawer?.classList.toggle("no-user", !user);

  /* ========================= AVATAR + PERFIL ========================= */
  if (user) {
    const avatarHeader = safe("avatar-user");
    const avatarDrawer = safe("avatar-user-drawer");
    const drawerName   = safe("drawer-name");
    const drawerEmail  = safe("drawer-email");

    const avatarUrl = user.photo_url || "imagenes/avatar-default.svg";

    if (avatarHeader) avatarHeader.src = avatarUrl;
    if (avatarDrawer) avatarDrawer.src = avatarUrl;

    if (drawerName)  drawerName.textContent  = user.nombre || "Usuario";
    if (drawerEmail) drawerEmail.textContent = user.email || "";
  }

  /* ========================= RESET BASE ========================= */
  nav?.classList.remove("hidden");
  cartBtn?.classList.remove("hidden");
  menuToggle?.classList.remove("hidden");
  titleEl?.classList.add("hidden");

  closeDrawer();

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

  /* ========================= ABRIR / CERRAR ========================= */
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

  /* ========================= CIERRES GLOBALES ========================= */
  scrim?.addEventListener("click", closeDrawer);

  document.addEventListener("click", (e) => {
    const drawerEl = safe("user-drawer");
    if (!drawerEl || !drawerEl.classList.contains("open")) return;
    if (drawerEl.contains(e.target)) return;
    closeDrawer();
  });

  drawer?.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", closeDrawer);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
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
