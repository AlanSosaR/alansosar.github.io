console.log("🧭 header.js — UI CORE FINAL (AUTH SAFE)");

/* =====================================================
   GUARDIÁN GLOBAL — EVITA DOBLE CARGA
===================================================== */
if (!window.__HEADER_CORE_LOADED__) {
  window.__HEADER_CORE_LOADED__ = true;

  const $ = (id) => document.getElementById(id);

/* =====================================================
   CARRITO (LECTURA SOLAMENTE)
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

/* =====================================================
   EXPORTAR PARA OTROS MÓDULOS (cart.js, recibo.js, etc.)
===================================================== */
window.updateHeaderCartCount = updateCartCount;

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
    $("user-drawer")?.classList.contains("open")
      ? closeDrawer()
      : openDrawer();
  }

  /* =====================================================
     INIT HEADER (EVENTOS UI BASE)
===================================================== */
  let HEADER_INITIALIZED = false;

  function initHeader() {
    if (HEADER_INITIALIZED) return;
    HEADER_INITIALIZED = true;

    console.log("✅ initHeader ejecutado (UI only)");

    // Hamburguesa (móvil)
    $("menu-toggle")?.addEventListener("click", toggleDrawer);

    // Scrim
    $("user-scrim")?.addEventListener("click", closeDrawer);

    // Carrito
    $("cart-btn")?.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });

    updateCartCount();
  }

  /* =====================================================
     EVENTOS GLOBALES (AUTH + UI)
===================================================== */
  if (!window.__HEADER_GLOBAL_EVENTS__) {
    window.__HEADER_GLOBAL_EVENTS__ = true;

    // CUANDO USUARIO SE LOGUEA
    document.addEventListener("userLoggedIn", () => {
      console.log("👤 header.js detecta login");

      updateCartCount();
      closeDrawer();

      // 🔑 ENGANCHAR AVATAR CUANDO YA EXISTE
      const avatarBtn = $("btn-header-user");
      if (avatarBtn && !avatarBtn.dataset.bound) {
        avatarBtn.addEventListener("click", toggleDrawer);
        avatarBtn.dataset.bound = "1";
      }

      // Logout (una sola vez)
      const logoutBtn = $("logout-btn");
      if (logoutBtn && !logoutBtn.dataset.bound) {
        logoutBtn.addEventListener("click", async () => {
          if (typeof window.corteroLogout === "function") {
            await window.corteroLogout(); // Supabase signOut real
          }
        });
        logoutBtn.dataset.bound = "1";
      }
    });

    // CUANDO USUARIO CIERRA SESIÓN
    document.addEventListener("userLoggedOut", () => {
      console.log("👤 header.js detecta logout");
      updateCartCount();
      closeDrawer();
    });

    // ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

/* =====================================================
   EXPORT
===================================================== */
window.initHeader = initHeader;

/* 🔔 SINCRONIZAR CONTADOR CUANDO EL HEADER YA EXISTE */
document.addEventListener("header:ready", () => {
  updateCartCount();
});
}
