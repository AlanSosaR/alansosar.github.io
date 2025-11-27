// ============================================================
// AUTH-UI.JS — Versión estable 2025 con localStorage
// ============================================================

console.log("👤 auth-ui.js cargado — versión estable");

document.addEventListener("DOMContentLoaded", () => {

  const sb = window.supabaseClient;
  const $id = (id) => document.getElementById(id);

  // ============================================================
  // ESTADOS DEL MENÚ
  // ============================================================
  function showLoggedOut() {
    if ($id("login-desktop")) $id("login-desktop").style.display = "inline-block";
    if ($id("profile-desktop")) $id("profile-desktop").style.display = "none";

    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "flex";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "none";
  }

  function showLoggedIn(user) {
    const name = user?.name || "Usuario";
    const photo = user?.photo_url || "imagenes/avatar-default.svg";

    // Desktop
    if ($id("login-desktop")) $id("login-desktop").style.display = "none";
    if ($id("profile-desktop")) {
      $id("profile-desktop").style.display = "flex";
      if ($id("profile-photo-desktop")) $id("profile-photo-desktop").src = photo;
      if ($id("hello-desktop")) $id("hello-desktop").textContent = `Hola, ${name}`;
    }

    // Mobile Drawer
    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "none";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "flex";
    if ($id("profile-photo-mobile")) $id("profile-photo-mobile").src = photo;
    if ($id("hello-mobile")) $id("hello-mobile").textContent = `Hola, ${name}`;
  }

  // ============================================================
  // MENU SEGÚN localStorage
  // ============================================================
  function refreshMenuFromStorage() {
    const logged = localStorage.getItem("cortero_logged");

    if (logged !== "1") {
      showLoggedOut();
      return;
    }

    const userRaw = localStorage.getItem("cortero_user");

    if (!userRaw) {
      showLoggedOut();
      return;
    }

    const user = JSON.parse(userRaw);
    showLoggedIn(user);
  }

  refreshMenuFromStorage();

  // ============================================================
  // EVENTOS AUTH SUPABASE
  // ============================================================
  sb.auth.onAuthStateChange(async (event) => {
    console.log("📌 Auth event:", event);

    if (event === "SIGNED_IN") {
      refreshMenuFromStorage();
    }

    if (event === "SIGNED_OUT") {
      showLoggedOut();
    }
  });

  // ============================================================
  // LOGOUT REAL
  // ============================================================
  async function doLogout(e) {
    e.preventDefault();

    try {
      await sb.auth.signOut();
    } catch (err) {
      console.warn("Error al cerrar sesión:", err);
    }

    // Borrar todo
    localStorage.removeItem("cortero_logged");
    localStorage.removeItem("cortero_user");

    showLoggedOut();

    window.location.replace("index.html");
  }

  if ($id("logout-desktop"))
    $id("logout-desktop").addEventListener("click", doLogout);

  if ($id("logout-mobile"))
    $id("logout-mobile").addEventListener("click", doLogout);

  // ============================================================
  // FOTO DE PERFIL ACTUALIZADA
  // ============================================================
  document.addEventListener("userPhotoUpdated", (e) => {
    const newPhoto = e.detail.photo_url;

    let user = JSON.parse(localStorage.getItem("cortero_user") || "{}");
    user.photo_url = newPhoto;

    localStorage.setItem("cortero_user", JSON.stringify(user));

    showLoggedIn(user);
  });

  // ============================================================
  // DATOS ACTUALIZADOS (NOMBRE / TELÉFONO)
  // ============================================================
  document.addEventListener("userDataUpdated", () => {
    const user = JSON.parse(localStorage.getItem("cortero_user") || "{}");
    showLoggedIn(user);
  });

});
