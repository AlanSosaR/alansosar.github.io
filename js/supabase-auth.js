// ============================================================
// SUPABASE AUTH — VERSIÓN CORRECTA (SIN ADMIN API)
// Registro con email verificado + guardar datos después
// ============================================================

const sb = window.supabaseClient;

window.supabaseAuth = {};

// ============================================================
// 🚀 REGISTRAR USUARIO (signUp normal — sí funciona con anon)
// ============================================================
window.supabaseAuth.registerUser = async function (
  email,
  password,
  phone,
  fullName,
  country
) {
  console.log("🚀 Registrando usuario...");

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "https://alansosar.github.io/login.html",
      data: {
        full_name: fullName,
        phone,
        country,
        avatar_url: "https://alansosar.github.io/imagenes/avatar-default.svg"
      }
    }
  });

  if (error) {
    console.error("❌ Error en signUp:", error);
    throw error;
  }

  console.log("🟢 Usuario registrado, pendiente de confirmar correo.");
  return data;
};

// ============================================================
// 🚪 LOGIN NORMAL
// ============================================================
window.supabaseAuth.loginUser = async function (email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

// ============================================================
// ✉️ MAGIC LINK
// ============================================================
window.supabaseAuth.loginMagicLink = async function (email) {
  return await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "https://alansosar.github.io/login.html"
    }
  });
};

// ============================================================
// 👤 OBTENER USUARIO
// ============================================================
window.supabaseAuth.getCurrentUser = async function () {
  const { data } = await sb.auth.getUser();
  return data.user || null;
};

// ============================================================
// 🔴 LOGOUT
// ============================================================
window.supabaseAuth.logoutUser = async function () {
  await sb.auth.signOut();
};
