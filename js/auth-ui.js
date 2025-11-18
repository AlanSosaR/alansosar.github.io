// =========================
//  AUTH UI (Supabase + UI)
// =========================

import { supabase } from "./supabase-client.js";
import { logoutUser, getCurrentUser } from "./supabase-auth.js";

/* =====================================================================
   CARGA DE USUARIO LOGUEADO + CONEXIÓN CON EL HEADER & DRAWER
   ===================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const user = await getCurrentUser();

  if (!user) {
    // ================= NO LOGUEADO =================
    showLoggedOutUI();
    return;
  }

  // ================= LOGUEADO =================
  updateUIForUser(user);
});

/* =====================================================================
   MOSTRAR TODO EL HEADER MODO NO LOGUEADO
   ===================================================================== */
function showLoggedOutUI() {
  // Desktop
  document.getElementById("login-desktop").style.display = "inline-block";
  document.getElementById("profile-desktop").style.display = "none";

  // Mobile
  document.getElementById("drawer-links-default").style.display = "flex";
  document.getElementById("drawer-links-logged").style.display = "none";
}

/* =====================================================================
   ACTUALIZAR HEADER Y DRAWER CON DATOS DEL USUARIO LOGUEADO
   ===================================================================== */
function updateUIForUser(user) {
  const name = user.user_metadata?.full_name || "Usuario";
  const photo = user.user_metadata?.photo_url || "imagenes/avatar-default.svg";

  // ================= DESKTOP =================
  document.getElementById("login-desktop").style.display = "none";
  const desktopProfile = document.getElementById("profile-desktop");
  desktopProfile.style.display = "flex";

  document.getElementById("profile-photo-desktop").src = photo;
  document.getElementById("hello-desktop").textContent = `Hola, ${name}`;

  // Toggle menú flotante escritorio
  desktopProfile.addEventListener("click", () => {
    document.getElementById("profile-menu").classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!desktopProfile.contains(e.target)) {
      document.getElementById("profile-menu").classList.remove("open");
    }
  });

  // ================= MÓVIL =================
  document.getElementById("drawer-links-default").style.display = "none";
  document.getElementById("drawer-links-logged").style.display = "flex";

  document.getElementById("profile-photo-mobile").src = photo;
  document.getElementById("hello-mobile").textContent = `Hola, ${name}`;

  // ================= LOGOUT =================
  document.getElementById("logout-desktop").addEventListener("click", async (e) => {
    e.preventDefault();
    await logoutUser();
    window.location.reload();
  });

  document.getElementById("logout-mobile").addEventListener("click", async (e) => {
    e.preventDefault();
    await logoutUser();
    window.location.reload();
  });
}
