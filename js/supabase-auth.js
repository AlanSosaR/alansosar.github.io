// ============================================================
// SUPABASE AUTH — VERSIÓN ESTABLE
// ============================================================

const sb = window.supabaseClient;
window.supabaseAuth = {};

console.log("🔥 supabase-auth.js cargado — versión FINAL");


// ============================================================
// REGISTRO — 100% COMPATIBLE CON TU TABLA USERS
// ============================================================
window.supabaseAuth.registerUser = async function (
  email,
  password,
  phone,
  fullName,
  country = "Honduras"
) {

  console.log("🚀 Registrando usuario…");

  // 1) Crear usuario en AUTH
  const { data: signUpData, error: signUpError } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
        country: country
      }
    }
  });

  if (signUpError) {
    console.error("❌ Error en signUp:", signUpError);
    throw signUpError;
  }

  // 2) Obtener sesión real después del signup
  const { data: sessionData } = await sb.auth.getSession();
  const session = sessionData?.session;

  if (!session || !session.user) {
    console.error("❌ No se obtuvo sesión después de registrar");
    throw new Error("No session after signup");
  }

  const user = session.user;

  // 3) Foto por defecto (URL ABSOLUTA)
  const photoURL = "https://alansosar.github.io/imagenes/avatar-default.svg";

  // 4) Insertar usuario en tu tabla "users"
  const now = new Date().toISOString();

  const { error: insertError } = await sb.from("users").insert({
    id: user.id,
    name: fullName,
    email: email,
    phone: phone,
    country: country,
    photo_url: photoURL,
    rol: "usuario",
    created_at: now,
    updated_at: now
  });

  if (insertError) {
    console.error("❌ Error al insertar en users:", insertError);
    throw insertError;
  }

  console.log("🟢 Usuario registrado correctamente");
  return session;
};



// ============================================================
// LOGIN NORMAL
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
// MAGIC LINK
// ============================================================
window.supabaseAuth.loginMagicLink = async function (email) {
  const { data, error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "https://alansosar.github.io/login.html"
    }
  });

  if (error) throw error;
  return data;
};



// ============================================================
// GET USER
// ============================================================
window.supabaseAuth.getCurrentUser = async function () {
  const { data } = await sb.auth.getUser();
  return data.user || null;
};



// ============================================================
// LOGOUT
// ============================================================
window.supabaseAuth.logoutUser = async function () {
  const { error } = await sb.auth.signOut();
  if (error) return false;
  return true;
};
