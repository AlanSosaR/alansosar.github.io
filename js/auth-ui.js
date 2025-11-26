// ============================================================
// AUTH-UI.JS — FIX FINAL 2025
// Soluciona: menú parpadea → se borra → vuelve a invitado
// Maneja correctamente INITIAL_SESSION
// ============================================================

console.log("👤 auth-ui.js cargado — FIX FINAL 2025");

document.addEventListener("DOMContentLoaded", () => {

  const sb = window.supabaseClient;
  const $id = (id) => document.getElementById(id);

  // --------------------------
  // 🔴 Mostrar invitado
  // --------------------------
  function showLoggedOut() {
    if ($id("login-desktop")) $id("login-desktop").style.display = "inline-block";
    if ($id("profile-desktop")) $id("profile-desktop").style.display = "none";

    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "flex";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "none";

    console.log("🔴 Menú: invitado");
  }

  // --------------------------
  // 🟢 Mostrar logueado
  // --------------------------
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

  // --------------------------
  // 🧠 Cargar usuario real desde tabla users
  // --------------------------
  async function cargarUsuario() {
    const { data } = await sb.auth.getSession();
    const session = data?.session;

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

  // --------------------------
  // 🚀 INICIO — manejar correctamente INITIAL_SESSION
  // --------------------------
  sb.auth.onAuthStateChange(async (event, session) => {
    console.log("🔄 Cambio sesión:", event);

    // ❗ FIX IMPORTANTE: NO BORRAR SESIÓN EN INITIAL_SESSION
    if (event === "INITIAL_SESSION") {
      if (session) cargarUsuario();
      return;
    }

    if (event === "SIGNED_IN") {
      await cargarUsuario();
    }

    if (event === "SIGNED_OUT") {
      showLoggedOut();
    }
  });

  // Cargar una vez al abrir
  cargarUsuario();
});
