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
     PERFIL UI — INYECCIÓN REAL (NUEVO)
  ===================================================== */
  function renderUserProfile(user, profile) {
    if (!user) return;

    const name =
      profile?.nombre ||
      user.user_metadata?.name ||
      "Usuario";

    const email = user.email;

    const avatar =
      profile?.avatar_url ||
      user.user_metadata?.avatar_url ||
      "/imagenes/avatar-default.svg";

    $("avatar-user")?.setAttribute("src", avatar);
    $("avatar-user-drawer")?.setAttribute("src", avatar);

    $("drawer-name") && ($("drawer-name").textContent = name);
    $("drawer-email") && ($("drawer-email").textContent = email);
  }

  /* =====================================================
     NAV PÚBLICO — OCULTAR CUANDO LOGUEADO (NUEVO)
  ===================================================== */
  function togglePublicNav(isLogged) {
    const nav = document.getElementById("public-nav");
    if (!nav) return;

    nav.style.display = isLogged ? "none" : "";
  }

  /* =====================================================
     🔑 SINCRONIZAR SESIÓN REAL DE SUPABASE
  ===================================================== */
  async function syncAuthFromSupabase() {
    if (!window.supabaseClient) return;

    const { data } = await supabaseClient.auth.getSession();
    const user = data?.session?.user;
    const logged = !!user;

    localStorage.setItem("cortero_logged", logged ? "1" : "0");

    document.dispatchEvent(
      new CustomEvent("authStateChanged", {
        detail: { logged, user }
      })
    );
  }

  /* =====================================================
     CARGAR PERFIL DESDE BD (NUEVO)
  ===================================================== */
  async function loadUserProfile(user) {
    if (!user || !window.supabaseClient) return;

    const { data: profile } = await supabaseClient
      .from("usuarios")
      .select("nombre, avatar_url")
      .eq("id", user.id)
      .single();

    renderUserProfile(user, profile);
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
      togglePublicNav(false);
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
      const logged = e.detail?.logged === true;
      const user = e.detail?.user || null;

      updateAuthUI(logged);
      togglePublicNav(logged);
      updateCartCount();
      closeDrawer();

      if (logged && user) {
        loadUserProfile(user);
      }
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
