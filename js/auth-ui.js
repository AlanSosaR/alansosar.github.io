// ============================================================
// AUTH-UI.JS — Versión FINAL 2025 (compatible con localStorage)
// Seguro en páginas SIN menú (login / registro)
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

  // Ejecutar al cargar
  refreshMenuFromStorage();

  // ============================================================
  // EVENTOS AUTH SUPABASE
  // ============================================================
  sb.auth.onAuthStateChange(async (event) => {
    console.log("📌 Auth event:", event);

    if (event === "SIGNED_IN") refreshMenuFromStorage();
    if (event === "SIGNED_OUT") showLoggedOut();
  });

  // ============================================================
  // LOGOUT REAL
  // ============================================================
  async function doLogout(e) {
    if (e) e.preventDefault();

    try { await sb.auth.signOut(); } catch {}

    localStorage.removeItem("cortero_logged");
    localStorage.removeItem("cortero_user");

    showLoggedOut();

    window.location.replace("index.html");
  }

  const logoutDesktop = safe("logout-desktop");
  const logoutMobile = safe("logout-mobile");

  if (logoutDesktop) logoutDesktop.addEventListener("click", doLogout);
  if (logoutMobile) logoutMobile.addEventListener("click", doLogout);

  // ============================================================
  // FOTO DE PERFIL ACTUALIZADA
  // ============================================================
  document.addEventListener("userPhotoUpdated", (e) => {
    const newPhoto = e.detail.photo_url;

    let user = JSON.parse(localStorage.getItem("cortero_user") || "{}");
    user.photo_url = newPhoto;

    localStorage.setItem("cortero_user", JSON.stringify(user));

    showLoggedIn(user);
  });

  // ============================================================
  // NOMBRE / TELÉFONO ACTUALIZADOS
  // ============================================================
  document.addEventListener("userDataUpdated", () => {
    const user = JSON.parse(localStorage.getItem("cortero_user") || "{}");
    showLoggedIn(user);
  });

});
