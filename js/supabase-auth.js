// ===========================================
// SUPABASE AUTH — MODO GLOBAL (EMAIL VERIFICADO)
// ===========================================

// usar SIEMPRE el cliente global que crea core-scripts-v2.js
const sb = window.supabaseClient;

// Exponer funciones globales
window.supabaseAuth = {};

console.log("🔥 supabase-auth.js cargado en modo GLOBAL");

// ================================
// REGISTRO (SOLO AUTH, SIN INSERT EN users)
// ================================
window.supabaseAuth.registerUser = async function (
  email,
  password,
  phone,
  fullName,
  country
) {
  console.log("🚀 Registrando usuario con email verificado...");

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      // A dónde va el usuario al confirmar el correo
      emailRedirectTo: "https://alansosar.github.io/login.html",
      data: {
        full_name: fullName,
        phone,
        country
      }
    }
  });

  if (error) {
    console.error("❌ Error en signUp:", error);
    throw error;
  }

  console.log("🟢 signUp OK. Falta que el usuario confirme el correo.");
  // OJO: aquí normalmente NO hay sesión si confirm_email está activado
  return data;
};

// ================================
// LOGIN NORMAL (PASSWORD)
// ================================
window.supabaseAuth.loginUser = async function (email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("❌ Error en loginUser:", error);
    throw error;
  }
  return data;
};

// ================================
// LOGIN CON MAGIC LINK (OTP)
// ================================
window.supabaseAuth.loginMagicLink = async function (email) {
  console.log("📨 Enviando Magic Link a:", email);

  const { data, error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "https://alansosar.github.io/login.html"
    }
  });

  if (error) {
    console.error("❌ Error enviando Magic Link:", error);
    throw error;
  }

  console.log("✅ Magic Link enviado correctamente");
  return data;
};

// ================================
// GET USER
// ================================
window.supabaseAuth.getCurrentUser = async function () {
  const { data } = await sb.auth.getUser();
  return data.user || null;
};

// ================================
// LOGOUT
// ================================
window.supabaseAuth.logoutUser = async function () {
  const { error } = await sb.auth.signOut();
  if (error) {
    console.error("⚠️ Error cerrando sesión:", error);
    return false;
  }
  return true;
};
