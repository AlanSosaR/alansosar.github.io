console.log("🧭 header.js — CORE CORREGIDO Y ESTABLE");

/* =====================================================
   HELPERS
===================================================== */
const $ = (id) => document.getElementById(id);

/* =====================================================
   USER CACHE
===================================================== */
function getUserCache() {
  try {
    if (localStorage.getItem("cortero_logged") !== "1") return null;
    return JSON.parse(localStorage.getItem("cortero_user"));
  } catch {
    return null;
  }
}

/* =====================================================
   BADGES
===================================================== */
function toggleGlobalNotificationDot(show) {
  ["menu-notification-badge", "avatar-notification-badge"].forEach((id) => {
    const el = $(id);
    el && el.classList.toggle("hidden", !show);
  });
}
window.toggleGlobalNotificationDot = toggleGlobalNotificationDot;

function setAdminOrdersCount(count) {
  const el = $("admin-orders-count");
  if (!el) return;
  el.textContent = count;
  el.classList.toggle("hidden", count === 0);
}
window.setAdminOrdersCount = setAdminOrdersCount;

function setMyOrdersCount(count) {
  const el = $("my-orders-count");
  if (!el) return;
  el.textContent = count;
  el.classList.toggle("hidden", count === 0);
}
window.setMyOrdersCount = setMyOrdersCount;

/* =====================================================
   CART
===================================================== */
function updateCartCount() {
  const badge = $("cart-count");
  if (!badge) return;
  try {
    const cart = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
    badge.textContent = cart.reduce((a, i) => a + Number(i.qty || 0), 0);
  } catch {
    badge.textContent = "0";
  }
}

function updateHeaderCartTitle() {
  const label = $("count-items");
  if (!label) return;
  try {
    const cart = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
    const total = cart.reduce((a, i) => a + Number(i.qty || 0), 0);
    label.textContent = `${total} ${total === 1 ? "café" : "cafés"}`;
  } catch {
    label.textContent = "0 cafés";
  }
}

/* =====================================================
   DRAWER
===================================================== */
function openDrawer() {
  $("user-drawer")?.classList.add("open");
  $("user-scrim")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  $("user-drawer")?.classList.remove("open");
  $("user-scrim")?.classList.remove("open");
  document.body.style.overflow = "";
}

function toggleDrawer() {
  $("user-drawer")?.classList.contains("open") ? closeDrawer() : openDrawer();
}
window.toggleDrawer = toggleDrawer;

/* =====================================================
   USER UI
===================================================== */
function syncUserUI() {
  const user = getUserCache();
  const header = document.querySelector(".header-fixed");
  const drawer = $("user-drawer");
  if (!header || !drawer) return;

  header.classList.toggle("logged", !!user);
  header.classList.toggle("no-user", !user);
  drawer.classList.toggle("logged", !!user);
  drawer.classList.toggle("no-user", !user);

  if (!user) {
    toggleGlobalNotificationDot(false);
    setAdminOrdersCount(0);
    setMyOrdersCount(0);
    return;
  }

  $("avatar-user") && ($("avatar-user").src = user.photo_url || "/imagenes/avatar-default.svg");
  $("avatar-user-drawer") && ($("avatar-user-drawer").src = user.photo_url || "/imagenes/avatar-default.svg");
  $("drawer-name") && ($("drawer-name").textContent = user.name || "Usuario");
  $("drawer-email") && ($("drawer-email").textContent = user.email || "");

  const isAdmin = user.rol === "admin";
  document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin));
  document.querySelectorAll(".client-only").forEach(el => el.classList.toggle("hidden", isAdmin));
}

/* =====================================================
   SEARCH / FILTER (SE MANTIENE)
===================================================== */
function setupHeaderSearch() {
  const searchWrap = $("header-search-container");
  const input = $("header-search-input");
  const filter = $("header-status-filter");
  const addBtn = $("header-add-btn");
  const titles = $("header-static-titles");

  if (!searchWrap || !input) return;

  const path = location.pathname;
  const show =
    path.includes("admin-productos") ||
    path.includes("admin-pedidos") ||
    path.includes("mis-pedidos");

  searchWrap.classList.toggle("hidden", !show);
  titles && titles.classList.toggle("hidden", show);
  filter && filter.classList.toggle("hidden", !path.includes("admin-pedidos"));
  addBtn && addBtn.classList.toggle("hidden", !path.includes("admin-productos"));

  if (!show) return;

  input.oninput = (e) =>
    document.dispatchEvent(new CustomEvent("header:search", { detail: e.target.value }));

  filter &&
    (filter.onchange = (e) =>
      document.dispatchEvent(new CustomEvent("header:filter", { detail: e.target.value })));

  addBtn &&
    (addBtn.onclick = () =>
      document.dispatchEvent(new CustomEvent("header:add-click")));
}

/* =====================================================
   HITBOX FIX
===================================================== */
function fixHeaderHitbox() {
  document
    .querySelectorAll(".header-search-wrap, .header-titles-wrap")
    .forEach((el) => {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") el.remove();
    });
}

/* =====================================================
   INIT
===================================================== */
let INIT = false;
function initHeader() {
  if (INIT) return;
  INIT = true;

  $("menu-toggle") && ($("menu-toggle").onclick = toggleDrawer);
  document.querySelector("#btn-header-user .header-avatar-button") &&
    (document.querySelector("#btn-header-user .header-avatar-button").onclick = toggleDrawer);

  $("cart-btn") &&
    ($("cart-btn").onclick = () =>
      (location.href = "/pages/shop/carrito.html"));

  $("user-scrim") && ($("user-scrim").onclick = closeDrawer);

  $("logout-btn") &&
    ($("logout-btn").onclick = async () => {
      try {
        await window.supabaseClient?.auth.signOut();
      } finally {
        closeDrawer();
        location.href = "/pages/home/index.html";
      }
    });

  syncUserUI();
  setupHeaderSearch();
  fixHeaderHitbox();
  updateCartCount();
  updateHeaderCartTitle();

  console.log("✅ header.js listo");
}

/* =====================================================
   EVENTS
===================================================== */
["cartUpdated", "userLoggedIn", "userLoggedOut"].forEach((evt) =>
  document.addEventListener(evt, () => {
    syncUserUI();
    updateCartCount();
    updateHeaderCartTitle();
  })
);

/* =====================================================
   BOOT
===================================================== */
document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", initHeader)
  : initHeader();



/* =====================================================
   LEGACY API (COMPATIBILIDAD)
===================================================== */
window.syncHeaderCounter = function () {
  updateCartCount();
  updateHeaderCartTitle();
};

window.syncHeaderUser = function () {
  syncUserUI();
};
