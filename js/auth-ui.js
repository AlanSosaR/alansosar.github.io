// ============================================================
// AUTH-UI.JS — CONTROL DE SESIÓN SIN ROMPER NINGUNA PÁGINA
// ============================================================

console.log("👤 auth-ui.js cargado — versión segura");

document.addEventListener("DOMContentLoaded", () => {
  const sb = window.supabaseClient;
  const auth = window.supabaseAuth;

  const getCurrentUser = auth?.getCurrentUser || (async () => null);
  const logoutUser = auth?.logoutUser || (async () => true);

  const $id = (id) => document.getElementById(id);

  // ======================================
  // 1) Ocultar todo cuando no hay usuario
  // ======================================
  function showLoggedOut() {
    const login = $id("login-desktop");
    const profile = $id("profile-desktop");

    if (login) login.style.display = "inline-block";
    if (profile) profile.style.display = "none";

    // Drawer móvil SOLO si existen los elementos
    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "flex";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "none";
  }

  // ======================================
  // 2) Mostrar usuario cuando está logueado
  // ======================================
  function showLoggedIn(user) {
    const name = user.name || "Usuario";
    const photo = user.photo_url || "imagenes/avatar-default.svg";

    if ($id("login-desktop")) $id("login-desktop").style.display = "none";
    if ($id("profile-desktop")) {
      $id("profile-desktop").style.display = "flex";
      $id("profile-photo-desktop").src = photo;
      $id("hello-desktop").textContent = `Hola, ${name}`;
    }

    // Drawer móvil
    if ($id("drawer-links-default")) $id("drawer-links-default").style.display = "none";
    if ($id("drawer-links-logged")) $id("drawer-links-logged").style.display = "flex";

    if ($id("profile-photo-mobile")) $id("profile-photo-mobile").src = photo;
    if ($id("hello-mobile")) $id("hello-mobile").textContent = `Hola, ${name}`;
  }

  // ======================================
  // 3) Cargar estado de sesión
  // ======================================
  (async () => {
    try {
      const authUser = await getCurrentUser();

      if (!authUser) {
        showLoggedOut();
        return;
      }

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

    } catch (e) {
      console.warn("Auth UI Error:", e);
      showLoggedOut();
    }
  })();

  // ======================================
  // 4) LOGOUT
  // ======================================
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
});
