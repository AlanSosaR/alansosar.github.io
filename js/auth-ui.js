// ============================================================
// AUTH-UI.JS — FIX FINAL 2025
// Funciona con Publishable Key + sessionStorage + GitHub Pages
// ============================================================

console.log("👤 auth-ui.js cargado — FIX DEFINITIVO");

document.addEventListener("DOMContentLoaded", () => {

  const sb = window.supabaseClient;
  const $id = (id) => document.getElementById(id);

  // ---------------------------------------------
  // 🔴 Menú Invitado
  // ---------------------------------------------
  function showLoggedOut() {
    if ($id("login-desktop")) $id("login-desktop").style.display = "inline-block";
    if ($id("profile-desktop")) $id("profile-desktop").style.display = "none";

    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "flex";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "none";

    console.log("🔴 Menú: invitado");
  }

  // ---------------------------------------------
  // 🟢 Menú Logueado
  // ---------------------------------------------
  function showLoggedIn(user) {
    const name = user.name || "Usuario";
    const photo = user.photo_url || "imagenes/avatar-default.svg";

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

    console.log("🟢 Menú: usuario logueado");
  }

  // ---------------------------------------------
  // 🧠 Intentar cargar sesión hasta 2 segundos
  // ---------------------------------------------
  async function esperarSesionReal() {
    let intentos = 0;

    while (intentos < 20) {     // 20 intentos → 100 ms cada uno → 2 segundos
      const { data } = await sb.auth.getSession();
      if (data?.session) {
        console.log("🟢 Sesión cargada correctamente");
        return data.session;
      }

      await new Promise(res => setTimeout(res, 100));
      intentos++;
    }

    console.log("⚠ No se encontró sesión tras esperar.");
    return null;
  }

  // ---------------------------------------------
  // 🧠 Cargar usuario desde tabla users
  // ---------------------------------------------
  async function cargarUsuario() {
    const session = await esperarSesionReal();

    if (!session) {
      showLoggedOut();
      return;
    }

    const uid = session.user.id;

    const { data: userData, error } = await sb
      .from("users")
      .select("*")
      .eq("id", uid)
      .single();

    if (error || !userData) {
      showLoggedOut();
      return;
    }

    showLoggedIn(userData);
  }

  // Ejecutar
  cargarUsuario();

  // ---------------------------------------------
  // 🔄 Si la sesión cambia (login/logout)
  // ---------------------------------------------
  sb.auth.onAuthStateChange(async (event, session) => {
    console.log("🔄 Evento:", event);

    if (event === "SIGNED_IN") {
      await cargarUsuario();
    }

    if (event === "SIGNED_OUT") {
      showLoggedOut();
    }
  });

  // ---------------------------------------------
  // 🚪 Logout
  // ---------------------------------------------
  if ($id("logout-desktop")) {
    $id("logout-desktop").addEventListener("click", async (e) => {
      e.preventDefault();
      await sb.auth.signOut();
      sessionStorage.removeItem("cortero-session");
      showLoggedOut();
      window.location.href = "index.html";
    });
  }

  if ($id("logout-mobile")) {
    $id("logout-mobile").addEventListener("click", async (e) => {
      e.preventDefault();
      await sb.auth.signOut();
      sessionStorage.removeItem("cortero-session");
      showLoggedOut();
      window.location.href = "index.html";
    });
  }

});
