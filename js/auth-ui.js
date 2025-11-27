// ============================================================
// AUTH-UI.JS — FIX DEFINITIVO 2025 (VERSIÓN COMPLETA + FOTO LIVE)
// ============================================================

console.log("👤 auth-ui.js cargado — FIX DEFINITIVO v2");

document.addEventListener("DOMContentLoaded", () => {
  const sb = window.supabaseClient;
  const $id = (id) => document.getElementById(id);

  let printedMenuState = null;

  // ============================================================
  // 🔴 MENÚ INVITADO
  // ============================================================
  function showLoggedOut() {
    if (printedMenuState !== "out") {
      console.log("🔴 Menú: invitado");
      printedMenuState = "out";
    }

    if ($id("login-desktop")) $id("login-desktop").style.display = "inline-block";
    if ($id("profile-desktop")) $id("profile-desktop").style.display = "none";

    if ($id("drawer-links-default"))
      $id("drawer-links-default").style.display = "flex";

    if ($id("drawer-links-logged"))
      $id("drawer-links-logged").style.display = "none";
  }

  // ============================================================
  // 🟢 MENÚ LOGUEADO
  // ============================================================
  function showLoggedIn(user) {
    if (printedMenuState !== "in") {
      console.log("🟢 Menú: usuario logueado");
      printedMenuState = "in";
    }

    const name = user?.name || "Usuario";
    const photo = user?.photo_url || "imagenes/avatar-default.svg";

    // Escritorio
    if ($id("login-desktop")) $id("login-desktop").style.display = "none";
    if ($id("profile-desktop")) {
      $id("profile-desktop").style.display = "flex";
      if ($id("profile-photo-desktop")) $id("profile-photo-desktop").src = photo;
      if ($id("hello-desktop")) $id("hello-desktop").textContent = `Hola, ${name}`;
    }

    // Móvil
    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "none";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "flex";

    if ($id("profile-photo-mobile")) $id("profile-photo-mobile").src = photo;
    if ($id("hello-mobile")) $id("hello-mobile").textContent = `Hola, ${name}`;
  }

  // ============================================================
  // 🧠 LEER USUARIO DESDE SESSIONSTORAGE
  // ============================================================
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

  refreshMenuFromStorage();

  // ============================================================
  // 🔄 EVENTOS DE SESIÓN SUPABASE
  // ============================================================
  sb.auth.onAuthStateChange(async (event) => {
    console.log("🔄 Evento:", event);

    if (event === "SIGNED_IN") {
      sessionStorage.setItem("cortero_logged", "1");
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

  // ============================================================
  // 🚪 LOGOUT
  // ============================================================
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

  if ($id("logout-desktop")) $id("logout-desktop").addEventListener("click", doLogout);
  if ($id("logout-mobile")) $id("logout-mobile").addEventListener("click", doLogout);

  // ============================================================
  // 🔥 ESCUCHAR ACTUALIZACIÓN DE FOTO DESDE PERFIL
  // ============================================================
  document.addEventListener("userPhotoUpdated", (e) => {
    const newPhoto = e.detail.photo_url;

    console.log("📸 Foto recibida en auth-ui:", newPhoto);

    // 1. Actualizar sessionStorage
    let user = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
    user.photo_url = newPhoto;

    sessionStorage.setItem("cortero_user", JSON.stringify(user));

    // 2. Actualizar UI inmediatamente
    showLoggedIn(user);
  });

  // ============================================================
  // 🔥 FUNCIÓN GLOBAL
  // ============================================================
  window.__refreshMenuFromSession = refreshMenuFromStorage;
  window.__showLoggedIn = showLoggedIn;
  window.__showLoggedOut = showLoggedOut;

});
