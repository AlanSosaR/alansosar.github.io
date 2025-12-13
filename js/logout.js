// ============================================================
// LOGOUT.JS — Café Cortero (2025)
// Maneja SOLO el cierre de sesión (UI + estado)
// ============================================================

console.log("🚪 logout.js cargado");

/* ========================= HELPERS ========================= */
function safe(id) {
  return document.getElementById(id);
}

/* ========================= LOGOUT ========================= */
function doLogout(e) {
  if (e) e.preventDefault();

  console.log("🚪 Cerrando sesión…");

  // 1️⃣ Eliminar sesión local
  localStorage.removeItem("cortero_user");

  // 2️⃣ Notificar al sistema
  document.dispatchEvent(new CustomEvent("userLoggedOut"));

  // 3️⃣ Cerrar drawer si está abierto
  const drawer = safe("user-drawer");
  const scrim = safe("user-scrim");

  if (drawer) {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  if (scrim) {
    scrim.classList.remove("open");
  }

  document.body.style.overflow = "";

  // 4️⃣ Redirigir (opcional pero recomendado)
  setTimeout(() => {
    window.location.href = "index.html";
  }, 100);
}

/* ========================= INIT ========================= */
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = safe("logout-btn");

  if (!logoutBtn) {
    console.warn("⚠️ Botón logout no encontrado (#logout-btn)");
    return;
  }

  logoutBtn.addEventListener("click", doLogout);
});
