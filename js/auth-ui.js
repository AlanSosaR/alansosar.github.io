// ============================================================
// AUTH-UI.JS — Versión estable con logout funcional
// ============================================================

console.log("👤 auth-ui.js cargado — versión estable");

document.addEventListener("DOMContentLoaded", () => {

  const sb = window.supabaseClient;
  const $id = (id) => document.getElementById(id);

  function showLoggedOut() {
    if ($id("login-desktop")) $id("login-desktop").style.display = "inline-block";
    if ($id("profile-desktop")) $id("profile-desktop").style.display = "none";
    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "flex";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "none";
  }

  function showLoggedIn(user) {
    const name = user?.name || "Usuario";
    const photo = user?.photo_url || "imagenes/avatar-default.svg";

    if ($id("login-desktop")) $id("login-desktop").style.display = "none";
    if ($id("profile-desktop")) {
      $id("profile-desktop").style.display = "flex";
      if ($id("profile-photo-desktop")) $id("profile-photo-desktop").src = photo;
      if ($id("hello-desktop")) $id("hello-desktop").textContent = `Hola, ${name}`;
    }

    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "none";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "flex";
    if ($id("profile-photo-mobile")) $id("profile-photo-mobile").src = photo;
    if ($id("hello-mobile")) $id("hello-mobile").textContent = `Hola, ${name}`;
  }

  function refreshMenuFromStorage() {
    const logged = sessionStorage.getItem("cortero_logged");
    if (logged !== "1") return showLoggedOut();

    const user = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
    showLoggedIn(user);
  }

  refreshMenuFromStorage();

  sb.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_IN") refreshMenuFromStorage();
    if (event === "SIGNED_OUT") showLoggedOut();
  });

  // ✅ LOGOUT FUNCIONAL
  async function doLogout(e) {
    e.preventDefault();
    try {
      await sb.auth.signOut();
    } catch (err) {
      console.warn("Error cerrando sesión:", err);
    }

    sessionStorage.removeItem("cortero_logged");
    sessionStorage.removeItem("cortero_user");
    showLoggedOut();
    window.location.replace("index.html");
  }

  if ($id("logout-desktop")) $id("logout-desktop").addEventListener("click", doLogout);
  if ($id("logout-mobile")) $id("logout-mobile").addEventListener("click", doLogout);

  document.addEventListener("userPhotoUpdated", (e) => {
    const newPhoto = e.detail.photo_url;
    let user = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
    user.photo_url = newPhoto;
    sessionStorage.setItem("cortero_user", JSON.stringify(user));
    showLoggedIn(user);
  });

  document.addEventListener("userDataUpdated", () => {
    const user = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
    showLoggedIn(user);
  });
});
