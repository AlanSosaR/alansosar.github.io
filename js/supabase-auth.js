/* ============================================================
   SUPABASE AUTH — VERSIÓN FINAL 2025
   Funciones puras: login, registro, logout, obtener usuario
   Compatible con supabase-client-core.js
   ============================================================ */

console.log("🔥 supabase-auth.js cargado — versión FINAL 2025");

const sb = window.supabaseClient;

// Namespace global
window.supabaseAuth = {};

/* ============================================================
   1) REGISTRO DE USUARIO (con email de verificación)
   ============================================================ */
window.supabaseAuth.registerUser = async function (email, password, phone, fullName) {

  console.log("🚀 Registrando usuario en Auth…");

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + "/login.html",
      data: {
        full_name: fullName || "",
        phone: phone || "",
        country: "Honduras"
      }
    }
  });

  if (error) {
    console.error("❌ Error al registrar:", error);
    throw error;
  }

  console.log("📩 Email de confirmación enviado a:", email);
  return data;
};

/* ============================================================
   2) LOGIN — Iniciar sesión normal
   ============================================================ */
window.supabaseAuth.loginUser = async function (email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("❌ Error Login:", error);
    throw error;
  }

  return data; // supabase-client-core manejará el perfil
};

/* ============================================================
   3) LOGIN — Magic Link
   ============================================================ */
window.supabaseAuth.loginMagicLink = async function (email) {
  const { data, error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + "/login.html"
    }
  });

  if (error) throw error;
  return data;
};

/* ============================================================
   4) Obtener usuario desde LocalStorage (versión segura)
   ============================================================ */
window.supabaseAuth.getCurrentUser = function () {
  try {
    const raw = localStorage.getItem("cortero_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/* ============================================================
   5) LOGOUT REAL
   ============================================================ */
window.supabaseAuth.logoutUser = async function () {
  try {
    await sb.auth.signOut();
  } catch (e) {
    console.warn("⚠ Error en logout:", e);
  }

  // Limpiar storage
  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");

  console.log("👋 Sesión cerrada correctamente");
};
