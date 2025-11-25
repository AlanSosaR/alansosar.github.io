// ============================================================
// AUTH-UI.JS — CONTROL DE MENÚ SEGÚN SESIÓN
// ============================================================

console.log("👤 auth-ui.js cargado — versión estable");

// Esperar DOM
document.addEventListener("DOMContentLoaded", () => {
  const sb = window.supabaseClient;        // Cliente global
  const auth = window.supabaseAuth;        // Funciones auth
  const getCurrentUser = auth?.getCurrentUser || (async () => null);
  const logoutUser = auth?.logoutUser || (async () => true);

  const $id = (id) => document.getElementById(id);

  // ------------------------------------------------------------
  // 🔴 1. MODO INVITADO (mostrar login, ocultar menú usuario)
  // ------------------------------------------------------------
  function showLoggedOut() {
    const loginDesktop = $id("login-desktop");
    const profileDesktop = $id("profile-desktop");

    if (loginDesktop) loginDesktop.style.display = "inline-block";
    if (profileDesktop) profileDesktop.style.display = "none";

    // Móvil
    if ($id("drawer-links-default"))
      $id("drawer-links-default").style.display = "flex";

    if ($id("drawer-links-logged"))
      $id("drawer-links-logged").style.display = "none";

    console.log("🔴 Menú en modo invitado");
  }

  // ------------------------------------------------------------
  // 🟢 2. MODO LOGUEADO (mostrar menú usuario)
  // ------------------------------------------------------------
  function showLoggedIn(user) {
    const name = user.name || "Usuario";
    const photo = user.photo_url || "imagenes/avatar-default.svg";

    // Escritorio
    if ($id("login-desktop")) $id("login-desktop").style.display = "none";

    if ($id("profile-desktop")) {
      $id("profile-desktop").style.display = "flex";
      $id("profile-photo-desktop").src = photo;
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

    console.log("🟢 Menú en modo usuario");
  }

  // ------------------------------------------------------------
  // 🧠 3. COMPROBAR SESIÓN AL CARGAR LA PÁGINA
  // ------------------------------------------------------------
  (async () => {
    try {
      const authUser = await getCurrentUser();

      if (!authUser) {
        showLoggedOut();
        return;
      }

      // Buscar usuario real en base de datos
      const { data, error } = await sb
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error || !data) {
        showLoggedOut();
        return;
      }

      showLoggedIn(data);

    } catch (error) {
      console.warn("⚠ Error cargando sesión:", error);
      showLoggedOut();
    }
  })();

  // ------------------------------------------------------------
  // 🚪 4. LOGOUT (escritorio y móvil)
  // ------------------------------------------------------------
  if ($id("logout-desktop")) {
    $id("logout-desktop").addEventListener("click", async (e) => {
      e.preventDefault();
      await logoutUser();
      window.location.reload();
    });
  }

  if ($id("logout-mobile")) {
    $id("logout-mobile").addEventListener("click", async (e) => {
      e.preventDefault();
      await logoutUser();
      window.location.reload();
    });
  }

  // ------------------------------------------------------------
  // 🔵 5. EXPONER FUNCIONES PARA core-scripts.js
  // ------------------------------------------------------------
  window.__showLoggedIn = showLoggedIn;
  window.__showLoggedOut = showLoggedOut;
});
