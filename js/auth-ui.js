// ============================================================
// AUTH-UI.JS — Versión FINAL 2025 (logout real + localStorage)
// Compatible con páginas con y sin menú
// ============================================================

console.log("👤 auth-ui.js cargado — versión FINAL");

// Helper seguro
function safe(id) {
  return document.getElementById(id) || null;
}

document.addEventListener("DOMContentLoaded", () => {

  const sb = window.supabaseClient;

  // ============================================================
  // ESTADOS DEL MENÚ
  // ============================================================
  function showLoggedOut() {
    const a = safe("login-desktop");
    const b = safe("profile-desktop");
    const c = safe("drawer-links-default");
    const d = safe("drawer-links-logged");

    if (a) a.style.display = "inline-block";
    if (b) b.style.display = "none";
    if (c) c.style.display = "flex";
    if (d) d.style.display = "none";
  }

  function showLoggedIn(user) {
    const name = user?.name || "Usuario";
    const photo = user?.photo_url || "imagenes/avatar-default.svg";

    const a = safe("login-desktop");
    const b = safe("profile-desktop");
    const c = safe("profile-photo-desktop");
    const d = safe("hello-desktop");
    const e = safe("drawer-links-default");
    const f = safe("drawer-links-logged");
    const g = safe("profile-photo-mobile");
    const h = safe("hello-mobile");

    if (a) a.style.display = "none";
    if (b) b.style.display = "flex";
    if (c) c.src = photo;
    if (d) d.textContent = `Hola, ${name}`;
    if (e) e.style.display = "none";
    if (f) f.style.display = "flex";
    if (g) g.src = photo;
    if (h) h.textContent = `Hola, ${name}`;
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

    const raw = localStorage.getItem("cortero_user");
    if (!raw) {
      showLoggedOut();
      return;
    }

    const user = JSON.parse(raw);
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
  // LOGOUT REAL — FIX DEFINITIVO 2025
  // ============================================================
  async function doLogout(e) {
    if (e) e.preventDefault();

    console.log("🚪 Cerrando sesión…");

    // 1. Cerrar sesión real en Supabase
    try {
      await sb.auth.signOut();
    } catch (err) {
      console.warn("⚠ Error Supabase signOut:", err);
    }

    // 2. Borrar TODA la info local
    localStorage.removeItem("cortero_logged");
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero-session");  // token Supabase almacenado

    // 3. Actualizar visualmente
    showLoggedOut();

    // 4. Redirigir (evita volver atrás a una sesión fantasma)
    window.location.replace("index.html");
  }

  const logoutDesktop = safe("logout-desktop");
  const logoutMobile = safe("logout-mobile");

  if (logoutDesktop) logoutDesktop.addEventListener("click", doLogout);
  if (logoutMobile) logoutMobile.addEventListener("click", doLogout);

  // ============================================================
  // EVENTOS: FOTO ACTUALIZADA
  // ============================================================
  document.addEventListener("userPhotoUpdated", (e) => {
    const raw = localStorage.getItem("cortero_user");
    if (!raw) return;

    const u = JSON.parse(raw);
    u.photo_url = e.detail.photo_url;

    localStorage.setItem("cortero_user", JSON.stringify(u));

    showLoggedIn(u);
  });

  // ============================================================
  // EVENTOS: NOMBRE / TELÉFONO ACTUALIZADOS
  // ============================================================
  document.addEventListener("userDataUpdated", () => {
    const raw = localStorage.getItem("cortero_user");
    if (!raw) return;

    const u = JSON.parse(raw);
    showLoggedIn(u);
  });

});
