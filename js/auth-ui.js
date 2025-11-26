// ============================================================
// AUTH-UI.JS — FIX DEFINITIVO 2025 (VERSIÓN SESSIONSTORAGE)
// ============================================================

console.log("👤 auth-ui.js cargado — FIX DEFINITIVO");

document.addEventListener("DOMContentLoaded", () => {
  const sb = window.supabaseClient;
  const $id = (id) => document.getElementById(id);

  // --------------------------
  // 🔴 Menú invitado
  // --------------------------
  function showLoggedOut() {
    if ($id("login-desktop")) $id("login-desktop").style.display = "inline-block";
    if ($id("profile-desktop")) $id("profile-desktop").style.display = "none";

    if ($id("drawer-links-default"))
      $id("drawer-links-default").style.display = "flex";
    if ($id("drawer-links-logged"))
      $id("drawer-links-logged").style.display = "none";

    console.log("🔴 Menú: invitado");
  }

  // --------------------------
  // 🟢 Menú logueado
  // --------------------------
  function showLoggedIn(user) {
    const name = user?.name || "Usuario";
    const photo = user?.photo_url || "imagenes/avatar-default.svg";

    // Escritorio
    if ($id("login-desktop")) $id("login-desktop").style.display = "none";

    if ($id("profile-desktop")) {
      $id("profile-desktop").style.display = "flex";
      if ($id("profile-photo-desktop"))
        $id("profile-photo-desktop").src = photo;
      if ($id("hello-desktop"))
        $id("hello-desktop").textContent = `Hola, ${name}`;
    }

    // Móvil
    if ($id("drawer-links-default"))
      $id("drawer-links-default").style.display = "none";
    if ($id("drawer-links-logged"))
      $id("drawer-links-logged").style.display = "flex";

    if ($id("profile-photo-mobile"))
      $id("profile-photo-mobile").src = photo;
    if ($id("hello-mobile"))
      $id("hello-mobile").textContent = `Hola, ${name}`;

    console.log("🟢 Menú: usuario logueado");
  }

  // --------------------------
  // 🧠 Pintar menú desde sessionStorage
  // --------------------------
  function refreshMenuFromStorage() {
    const flag = sessionStorage.getItem("cortero_logged");

    if (flag !== "1") {
      showLoggedOut();
      return;
    }

    let user = null;
    const raw = sessionStorage.getItem("cortero_user");
    if (raw) {
      try {
        user = JSON.parse(raw);
      } catch {
        user = null;
      }
    }

    showLoggedIn(user || {});
  }

  // Pintar al cargar la página
  refreshMenuFromStorage();

  // --------------------------
  // 🔄 Escuchar cambios de sesión
  // --------------------------
  sb.auth.onAuthStateChange(async (event) => {
    console.log("🔄 Evento:", event);

    if (event === "SIGNED_IN") {
      if (!sessionStorage.getItem("cortero_logged")) {
        sessionStorage.setItem("cortero_logged", "1");
      }
      refreshMenuFromStorage();
    }

    if (event === "SIGNED_OUT") {
      sessionStorage.removeItem("cortero_logged");
      sessionStorage.removeItem("cortero_user");
      showLoggedOut();
    }

    if (event === "INITIAL_SESSION") {
      refreshMenuFromStorage();
    }
  });

  // --------------------------
  // 🚪 Logout
  // --------------------------
  async function doLogout(e) {
    e.preventDefault();
    try {
      if (window.supabaseAuth?.logoutUser) {
        await window.supabaseAuth.logoutUser();
      } else {
        await sb.auth.signOut();
      }
    } catch (err) {
      console.warn("Error en logout:", err);
    }

    sessionStorage.removeItem("cortero_logged");
    sessionStorage.removeItem("cortero_user");

    showLoggedOut();
    window.location.href = "index.html";
  }

  if ($id("logout-desktop")) {
    $id("logout-desktop").addEventListener("click", doLogout);
  }

  if ($id("logout-mobile")) {
    $id("logout-mobile").addEventListener("click", doLogout);
  }

  // ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
  // 🔥 FIX FINAL — HACER PÚBLICA LA FUNCIÓN PARA QUE LOGIN LA PUEDA LLAMAR
  window.__refreshMenuFromSession = refreshMenuFromStorage;

  // También dejamos disponibles estas funciones por compatibilidad
  window.__showLoggedIn = showLoggedIn;
  window.__showLoggedOut = showLoggedOut;
  // ⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆

});
