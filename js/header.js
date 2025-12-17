/* ============================================================
   HEADER + MENÚ — Café Cortero 2025
   ✔ Drawer móvil / desktop
   ✔ Avatar
   ✔ Hamburguesa
   ✔ Logout REAL con Supabase
============================================================ */

/* ========================= SAFE ========================= */
function safe(id) {
  return document.getElementById(id);
}

/* ========================= SUPABASE SAFE ========================= */
function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

/* ============================================================
   INIT HEADER + MENÚ
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  const drawer     = safe("user-drawer");
  const scrim      = safe("user-scrim");
  const menuToggle = safe("menu-toggle");
  const logoutBtn  = safe("logout-btn");
  const sb         = getSupabaseClient();

  /* =========================
     ABRIR / CERRAR DRAWER
  ========================= */
  function openDrawer() {
    if (!drawer || !scrim) return;
    drawer.classList.add("open");
    scrim.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    if (!drawer || !scrim) return;
    drawer.classList.remove("open");
    scrim.classList.remove("open");
    document.body.style.overflow = "";
  }

  /* =========================
     HAMBURGUESA (MÓVIL)
  ========================= */
  menuToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    drawer?.classList.contains("open")
      ? closeDrawer()
      : openDrawer();
  });

  /* =========================
     AVATAR (DESKTOP)
  ========================= */
  document.addEventListener("click", (e) => {
    const avatarBtn = e.target.closest("#btn-header-user");
    if (!avatarBtn) return;

    e.preventDefault();
    e.stopPropagation();
    openDrawer();
  });

  /* =========================
     SCRIM
  ========================= */
  scrim?.addEventListener("click", closeDrawer);

  /* =========================
     ESC PARA CERRAR
  ========================= */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  /* =========================
     LOGOUT REAL (SUPABASE)
  ========================= */
  async function logoutAndRedirect() {
    try {
      if (sb) {
        await sb.auth.signOut(); // ✅ LOGOUT REAL
      }
    } catch (err) {
      console.error("❌ Error al cerrar sesión:", err);
    }

    // Limpieza local
    localStorage.removeItem("cortero_user");

    // UI
    closeDrawer();

    // Redirección
    window.location.href = "index.html";
  }

  logoutBtn?.addEventListener("click", logoutAndRedirect);

});
