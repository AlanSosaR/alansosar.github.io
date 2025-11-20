// ============================================================
// AUTH-UI.JS — CONTROL DE MENÚ / SESIÓN EN TODAS LAS PÁGINAS
// Usa window.supabaseClient y window.supabaseAuth
// NO ROMPE si la página no tiene header / menú
// ============================================================

console.log("👤 auth-ui.js cargado en modo GLOBAL");

document.addEventListener("DOMContentLoaded", () => {
  const sb = window.supabaseClient;
  const supAuth = window.supabaseAuth || {};

  const getCurrentUser = supAuth.getCurrentUser || (async () => null);
  const logoutUser = supAuth.logoutUser || (async () => true);

  const $id = (id) => document.getElementById(id);

  // ============================
  // ACTUALIZAR MENÚ LOGIN
  // ============================
  function actualizarMenuLogin(user) {
    if (!user) return;

    const loginDesktop = $id("login-desktop");
    const profileDesktop = $id("profile-desktop");
    const helloDesktop = $id("hello-desktop");
    const photoDesktop = $id("profile-photo-desktop");

    const drawerDefault = $id("drawer-links-default");
    const drawerLogged = $id("drawer-links-logged");
    const helloMobile = $id("hello-mobile");
    const photoMobile = $id("profile-photo-mobile");

    // Menú escritorio
    if (loginDesktop && profileDesktop) {
      loginDesktop.style.display = "none";
      profileDesktop.style.display = "flex";
    }
    if (helloDesktop) helloDesktop.textContent = `Hola, ${user.name || "Usuario"}`;
    if (photoDesktop && user.photo_url) photoDesktop.src = user.photo_url;

    // Drawer móvil
    if (drawerDefault && drawerLogged) {
      drawerDefault.style.display = "none";
      drawerLogged.style.display = "block";
    }
    if (helloMobile) helloMobile.textContent = `Hola, ${user.name || "Usuario"}`;
    if (photoMobile && user.photo_url) photoMobile.src = user.photo_url;
  }

  // ============================
  // ACTUALIZAR MENÚ LOGOUT
  // ============================
  function actualizarMenuLogout() {
    const loginDesktop = $id("login-desktop");
    const profileDesktop = $id("profile-desktop");

    const drawerDefault = $id("drawer-links-default");
    const drawerLogged = $id("drawer-links-logged");

    if (loginDesktop && profileDesktop) {
      loginDesktop.style.display = "inline-block";
      profileDesktop.style.display = "none";
    }

    if (drawerDefault && drawerLogged) {
      drawerDefault.style.display = "block";
      drawerLogged.style.display = "none";
    }
  }

  window.actualizarMenuLogin = actualizarMenuLogin;
  window.actualizarMenuLogout = actualizarMenuLogout;

  // ============================
  // CARGAR ESTADO INICIAL DE SESIÓN
  // ============================
  (async () => {
    try {
      const sessionUser = await getCurrentUser();
      if (!sessionUser) {
        actualizarMenuLogout();
        return;
      }

      const { data: row, error } = await sb
        .from("users")
        .select("*")
        .eq("id", sessionUser.id)
        .single();

      if (error || !row) {
        actualizarMenuLogout();
        return;
      }

      actualizarMenuLogin(row);
    } catch (err) {
      actualizarMenuLogout();
    }
  })();

  // ============================
  // LOGOUT
  // ============================
  const logoutDesktopBtn = $id("logout-desktop");
  const logoutMobileBtn = $id("logout-mobile");

  if (logoutDesktopBtn) {
    logoutDesktopBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await logoutUser();
      window.location.reload();
    });
  }

  if (logoutMobileBtn) {
    logoutMobileBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await logoutUser();
      window.location.reload();
    });
  }
});
