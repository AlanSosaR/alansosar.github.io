// ============================================================
// AUTH-UI.JS — CONTROL DE MENÚ SEGÚN SESIÓN (VERSIÓN FINAL 2025)
// ============================================================

console.log("👤 auth-ui.js cargado — versión FINAL 2025");

document.addEventListener("DOMContentLoaded", () => {

  const sb = window.supabaseClient;
  const $id = (id) => document.getElementById(id);

  // ------------------------------------------------------------
  // 🔴 MODO INVITADO
  // ------------------------------------------------------------
  function showLoggedOut() {
    if ($id("login-desktop")) $id("login-desktop").style.display = "inline-block";
    if ($id("profile-desktop")) $id("profile-desktop").style.display = "none";

    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "flex";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "none";

    console.log("🔴 Menú: invitado");
  }

  // ------------------------------------------------------------
  // 🟢 MODO LOGUEADO
  // ------------------------------------------------------------
  function showLoggedIn(user) {
    const name = user.name || "Usuario";
    const photo = user.photo_url || "imagenes/avatar-default.svg";

    if ($id("login-desktop")) $id("login-desktop").style.display = "none";

    if ($id("profile-desktop")) {
      $id("profile-desktop").style.display = "flex";
      $id("profile-photo-desktop").src = photo;
      $id("hello-desktop").textContent = `Hola, ${name}`;
    }

    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "none";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "flex";

    if ($id("profile-photo-mobile")) $id("profile-photo-mobile").src = photo;
    if ($id("hello-mobile")) $id("hello-mobile").textContent = `Hola, ${name}`;

    console.log("🟢 Menú: usuario logueado");
  }

  // ------------------------------------------------------------
  // 🧠 ESPERAR QUE SUPABASE CARGUE LA SESIÓN REAL
  // ------------------------------------------------------------
  async function esperarSesionLista() {
    for (let i = 0; i < 20; i++) { // hasta 20 intentos (1 segundo)
      const { data } = await sb.auth.getSession();
      if (data?.session) return data.session;
      await new Promise(r => setTimeout(r, 50));
    }
    return null;
  }

  // ------------------------------------------------------------
  // 🧠 CARGAR SESIÓN DESDE TABLA USERS
  // ------------------------------------------------------------
  async function cargarSesion() {
    const { data } = await sb.auth.getSession();
    const session = data?.session;

    if (!session) {
      showLoggedOut();
      return;
    }

    const id = session.user.id;

    const { data: userData, error } = await sb
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !userData) {
      showLoggedOut();
      return;
    }

    showLoggedIn(userData);
  }

  // ------------------------------------------------------------
  // 🚀 INICIO — ESPERAR SESIÓN Y MOSTRAR MENÚ
  // ------------------------------------------------------------
  esperarSesionLista().then(() => cargarSesion());

  // ------------------------------------------------------------
  // 🔄 CAMBIOS EN SESIÓN EN VIVO
  // ------------------------------------------------------------
  sb.auth.onAuthStateChange(async (event, session) => {
    console.log("🔄 Cambio sesión:", event);

    if (event === "SIGNED_IN") {
      await esperarSesionLista();
      await cargarSesion();
    }

    if (event === "SIGNED_OUT") {
      showLoggedOut();
    }
  });

  // ------------------------------------------------------------
  // 🚪 LOGOUT
  // ------------------------------------------------------------
  if ($id("logout-desktop")) {
    $id("logout-desktop").addEventListener("click", async (e) => {
      e.preventDefault();
      await sb.auth.signOut();
      window.location.reload();
    });
  }

  if ($id("logout-mobile")) {
    $id("logout-mobile").addEventListener("click", async (e) => {
      e.preventDefault();
      await sb.auth.signOut();
      window.location.reload();
    });
  }

  // Exponer por seguridad
  window.__showLoggedIn = showLoggedIn;
  window.__showLoggedOut = showLoggedOut;

});
