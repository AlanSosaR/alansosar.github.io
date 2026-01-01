/* ============================================================
   SUPABASE AUTH — COMPATIBLE CON SUPABASE CLIENT
   ✔ Auth-first (signUp / signIn)
   ✔ NO maneja sesión
   ✔ NO toca storage
   ✔ Logout delega a corteroLogout()
============================================================ */

console.log("🔥 supabase-auth.js cargado — COMPATIBLE 2025");

const sb = window.supabaseClient;

// Namespace global
window.supabaseAuth = {};

/* ============================================================
   1) REGISTRO
============================================================ */
window.supabaseAuth.registerUser = async function (
  email,
  password,
  phone,
  fullName,
  country = "Honduras",
  photoUrl = "/imagenes/avatar-default.svg"
) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + "/login.html",
      data: {
        name: fullName,
        phone,
        country,
        photo_url: photoUrl,
        rol: "cliente"
      }
    }
  });

  if (error) throw error;
  return data;
};

/* ============================================================
   2) LOGIN — Email / Password
============================================================ */
window.supabaseAuth.loginUser = async function (email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
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
   4) PERFIL CACHEADO (READ-ONLY)
============================================================ */
window.supabaseAuth.getCurrentUser = function () {
  try {
    const raw = localStorage.getItem("cortero_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/* ============================================================
   5) LOGOUT — DELEGADO (CLAVE)
============================================================ */
window.supabaseAuth.logoutUser = function () {
  if (typeof window.corteroLogout === "function") {
    console.log("🚪 Logout delegado a corteroLogout()");
    window.corteroLogout();
  } else {
    console.error("❌ corteroLogout no está definido");
  }
};
