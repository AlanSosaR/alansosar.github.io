// ===========================================
// SUPABASE AUTH — VERSIÓN ESTABLE DEFINITIVA
// ===========================================

const sb = window.supabaseClient;
window.supabaseAuth = {};

console.log("🔥 supabase-auth.js cargado — versión final 2025");

// ===========================================
// REGISTRO — COMPATIBLE CON PUBLISHABLE KEY
// ===========================================
window.supabaseAuth.registerUser = async function (
  email,
  password,
  phone,
  fullName,
  country = "Honduras"
) {

  console.log("🚀 Registrando usuario…");

  // 1) Crear usuario en AUTH (Publishable key → NO habrá sesión)
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "https://alansosar.github.io/login.html", // 🔥 FIX IMPORTANTE
      data: {
        full_name: fullName,
        phone: phone,
        country: country
      }
    }
  });

  if (error) {
    console.error("❌ Error en signUp:", error);
    throw error;
  }

  const user = data.user;

  if (!user) {
    throw new Error("No user returned from signUp");
  }

  console.log("📨 Se envió el correo de confirmación.");

  // 2) Insertar usuario en tabla users
  //    ✔ Publishable key SÍ permite escribir si RLS lo permite
  const now = new Date().toISOString();
  const photoURL = "https://alansosar.github.io/imagenes/avatar-default.svg";

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

  console.log("🟢 Usuario guardado correctamente en users");
  return true;
};

// ===========================================
// LOGIN
// ===========================================
window.supabaseAuth.loginUser = async function (email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

// ===========================================
// MAGIC LINK
// ===========================================
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

// ===========================================
// GET USER
// ===========================================
window.supabaseAuth.getCurrentUser = async function () {
  const { data } = await sb.auth.getUser();
  return data.user || null;
};

// ===========================================
// LOGOUT
// ===========================================
window.supabaseAuth.logoutUser = async function () {
  const { error } = await sb.auth.signOut();
  return !error;
};
