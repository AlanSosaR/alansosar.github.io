console.log("🧭 header.js — CORE FINAL ESTABLE");

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
      badge.textContent = cart.reduce((a, i) => a + i.qty, 0);
    } catch {
      badge.textContent = "0";
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
    $("user-drawer")?.classList.contains("open")
      ? closeDrawer()
      : openDrawer();
  }

  /* =====================================================
     AUTH UI — SOLO CLASES (NO SE TOCA)
  ===================================================== */
  function updateAuthUI(isLogged) {
    const header = document.querySelector(".header-fixed");
    const drawer = $("user-drawer");
    if (!header || !drawer) return;

    header.classList.toggle("logged", isLogged);
    header.classList.toggle("no-user", !isLogged);
    drawer.classList.toggle("logged", isLogged);
    drawer.classList.toggle("no-user", !isLogged);
  }

  /* =====================================================
     🔑 SINCRONIZAR SESIÓN REAL DE SUPABASE
  ===================================================== */
  async function syncAuthFromSupabase() {
    if (!window.supabaseClient) return;

    const { data } = await supabaseClient.auth.getSession();

    const logged = !!data?.session?.user;

    localStorage.setItem("cortero_logged", logged ? "1" : "0");

    document.dispatchEvent(
      new CustomEvent("authStateChanged", {
        detail: { logged }
      })
    );
  }

  /* =====================================================
     INIT HEADER
  ===================================================== */
  let HEADER_INITIALIZED = false;

  function initHeader() {
    if (HEADER_INITIALIZED) return;
    HEADER_INITIALIZED = true;

    console.log("✅ initHeader ejecutado");

    $("menu-toggle")?.addEventListener("click", toggleDrawer);
    $("btn-header-user")?.addEventListener("click", toggleDrawer);
    $("user-scrim")?.addEventListener("click", closeDrawer);

    $("logout-btn")?.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      localStorage.setItem("cortero_logged", "0");
      updateAuthUI(false);
      closeDrawer();
    });

    $("cart-btn")?.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });

    updateCartCount();
    syncAuthFromSupabase(); // 🔑 CLAVE
  }

  /* =====================================================
     EVENTOS GLOBALES
  ===================================================== */
  if (!window.__HEADER_GLOBAL_EVENTS__) {
    window.__HEADER_GLOBAL_EVENTS__ = true;

    document.addEventListener("authStateChanged", (e) => {
      updateAuthUI(e.detail?.logged === true);
      updateCartCount();
      closeDrawer();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  /* =====================================================
     EXPORT
  ===================================================== */
  window.initHeader = initHeader;
}
