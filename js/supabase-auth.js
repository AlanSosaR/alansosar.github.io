/* ============================================================
   SUPABASE AUTH — VERSIÓN FINAL 2025
   Funciones puras: login, registro, logout, obtener usuario
   ============================================================ */

console.log("🔥 supabase-auth.js cargado — versión limpia 2025");

const sb = window.supabaseClient;

// Namespace global
window.supabaseAuth = {};

/* ============================================================
   1) REGISTRO
   ============================================================ */
window.supabaseAuth.registerUser = async function (email, password, phone, fullName) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || "",
        phone: phone || "",
        country: ""   // vacío como pediste
      }
    }
  });

  if (error) throw error;
  return data;
};

/* ============================================================
   2) LOGIN
   ============================================================ */
window.supabaseAuth.loginUser = async function (email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  // Supabase-client.js se encargará de:
  // - cargar perfil
  // - guardar en localStorage
  // - emitir eventos
  return data;
};

/* ============================================================
   3) MAGIC LINK
   ============================================================ */
window.supabaseAuth.loginMagicLink = async function (email) {
  const { data, error } = await sb.auth.signInWithOtp({ email });
  if (error) throw error;
  return data;
};

/* ============================================================
   4) OBTENER USUARIO DESDE LOCALSTORAGE
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
    console.warn("⚠ Error al cerrar sesión:", e);
  }

  // limpiar localStorage
  localStorage.removeItem("cortero-session");
  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");

  console.log("👋 Logout completado — storage limpiado");
};
