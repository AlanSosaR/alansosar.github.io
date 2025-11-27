// ============================================================
// AUTH-UI.JS — FIX DEFINITIVO 2025 (MENÚ + FOTO LIVE + LOGOUT REAL)
// ============================================================

console.log("👤 auth-ui.js cargado — FIX DEFINITIVO 2025");

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

    // Escritorio
    if ($id("login-desktop")) $id("login-desktop").style.display = "inline-block";
    if ($id("profile-desktop")) $id("profile-desktop").style.display = "none";

    // Móvil
    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "flex";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "none";
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
    const logged = sessionStorage.getItem("cortero_logged");

    if (logged !== "1") {
      showLoggedOut();
      return;
    }

    let user = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
    showLoggedIn(user);
  }

  // Ejecutar al cargar página
  refreshMenuFromStorage();

  // ============================================================
  // 🔄 EVENTOS DE SESIÓN SUPABASE
  // ============================================================
  sb.auth.onAuthStateChange(async (event) => {
    console.log("🔄 Evento de sesión:", event);

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
  // 🚪 LOGOUT — FIX DEFINITIVO 2025 (iPhone / Safari / GH Pages)
  // ============================================================
  async function doLogout(e) {
    if (e) e.preventDefault();

    console.log("🚪 Cerrando sesión…");

    try {
      // Cierra sesión REAL en el módulo supabaseAuth si existe
      if (window.supabaseAuth?.logoutUser) {
        const resp = await window.supabaseAuth.logoutUser();
        if (!resp.ok) console.warn("Error logout:", resp.error);
      } else {
        await sb.auth.signOut();
      }
    } catch (err) {
      console.warn("Error en logout:", err);
    }

    // Limpiar datos locales
    sessionStorage.removeItem("cortero_logged");
    sessionStorage.removeItem("cortero_user");

    // Notificar a todo el sitio
    document.dispatchEvent(new CustomEvent("userLoggedOut"));

    // Cerrar drawer si está abierto
    const drawer = document.getElementById("drawer");
    if (drawer) drawer.classList.remove("open");

    // Safari necesita replace() para recargar realmente
    setTimeout(() => {
      window.location.replace("index.html");
    }, 120);
  }

  if ($id("logout-desktop")) $id("logout-desktop").addEventListener("click", doLogout);
  if ($id("logout-mobile")) $id("logout-mobile").addEventListener("click", doLogout);

  // ============================================================
  // 📸 ACTUALIZACIÓN LIVE DE FOTO DESDE PERFIL
  // ============================================================
  document.addEventListener("userPhotoUpdated", (e) => {
    const newPhoto = e.detail.photo_url;
    console.log("📸 Foto actualizada en auth-ui:", newPhoto);

    let user = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
    user.photo_url = newPhoto;

    sessionStorage.setItem("cortero_user", JSON.stringify(user));
    showLoggedIn(user);
  });

  // ============================================================
  // 📝 ACTUALIZACIÓN LIVE DE NOMBRE/TELÉFONO
  // ============================================================
  document.addEventListener("userDataUpdated", () => {
    let user = JSON.parse(sessionStorage.getItem("cortero_user") || "{}");
    showLoggedIn(user);
  });

  // ============================================================
  // 🔥 FUNCIONES GLOBALES
  // ============================================================
  window.__refreshMenuFromSession = refreshMenuFromStorage;
  window.__showLoggedIn = showLoggedIn;
  window.__showLoggedOut = showLoggedOut;

});
