// ============================================================
// AUTH-UI.JS — VERSIÓN SIMPLE Y ESTABLE
// Controla el menú según la sesión
// ============================================================

console.log("👤 auth-ui.js cargado — VERSIÓN SIMPLE");

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
    const name = user.name || "Usuario";
    const photo = user.photo_url || "imagenes/avatar-default.svg";

    if ($id("login-desktop")) $id("login-desktop").style.display = "none";

    if ($id("profile-desktop")) {
      $id("profile-desktop").style.display = "flex";
      if ($id("profile-photo-desktop")) {
        $id("profile-photo-desktop").src = photo;
      }
      if ($id("hello-desktop")) {
        $id("hello-desktop").textContent = `Hola, ${name}`;
      }
    }

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
  // 🧠 Leer sesión y pintar menú
  // --------------------------
  async function refreshMenuFromSession() {
    const { data } = await sb.auth.getSession();
    const session = data?.session;

    if (!session) {
      showLoggedOut();
      return;
    }

    const userId = session.user.id;

    const { data: userData, error } = await sb
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !userData) {
      console.log("⚠ No se encontró usuario en tabla users:", error);
      showLoggedOut();
      return;
    }

    showLoggedIn(userData);
  }

  // Pintar menú al cargar la página
  refreshMenuFromSession();

  // --------------------------
  // 🔄 Escuchar cambios de sesión
  // --------------------------
  sb.auth.onAuthStateChange(async (event, session) => {
    console.log("🔄 Cambio sesión:", event);

    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      await refreshMenuFromSession();
    }

    if (event === "SIGNED_OUT") {
      showLoggedOut();
    }
  });

  // --------------------------
  // 🚪 Logout (usa supabaseAuth.logoutUser)
  // --------------------------
  if ($id("logout-desktop")) {
    $id("logout-desktop").addEventListener("click", async (e) => {
      e.preventDefault();
      if (window.supabaseAuth?.logoutUser) {
        await window.supabaseAuth.logoutUser();
      } else {
        await sb.auth.signOut();
      }
      showLoggedOut();
      window.location.href = "index.html";
    });
  }

  if ($id("logout-mobile")) {
    $id("logout-mobile").addEventListener("click", async (e) => {
      e.preventDefault();
      if (window.supabaseAuth?.logoutUser) {
        await window.supabaseAuth.logoutUser();
      } else {
        await sb.auth.signOut();
      }
      showLoggedOut();
      window.location.href = "index.html";
    });
  }

  // Por si algún script externo lo usa
  window.__showLoggedIn = showLoggedIn;
  window.__showLoggedOut = showLoggedOut;
});
