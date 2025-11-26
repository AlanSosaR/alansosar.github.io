/* ============================================================
   SUPABASE AUTH — VERSIÓN FINAL V3 (100% ESTABLE)
   Compatible con Publishable Key + sessionStorage
   ============================================================ */

const sb = window.supabaseClient;
window.supabaseAuth = {};

console.log("🔥 supabase-auth-v3.js cargado — versión FINAL");

/* ============================================================
   1) REGISTRO (signUp + insert en tabla users)
   ============================================================ */
window.supabaseAuth.registerUser = async function (
  email,
  password,
  phone,
  fullName,
  country = "Honduras"
) {
  console.log("🚀 Registrando usuario…");

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
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

  const user = data.user;
  if (!user) throw new Error("No user returned from signUp");

  console.log("📨 Se envió el correo de verificación.");

  // Insert en tabla users
  const now = new Date().toISOString();
  const photoURL = "https://alansosar.github.io/imagenes/avatar-default.svg";

  const { error: insertError } = await sb.from("users").insert({
    id: user.id,
    name: fullName,
    email,
    phone,
    country,
    photo_url: photoURL,
    rol: "usuario",
    created_at: now,
    updated_at: now
  });

  if (insertError) {
    console.error("❌ Error al insertar en users:", insertError);
    throw insertError;
  }

  console.log("🟢 Usuario creado en tabla users ✔");
  return true;
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
  return data;
};

/* ============================================================
   3) MAGIC LINK LOGIN
   ============================================================ */
window.supabaseAuth.loginMagicLink = async function (email) {
  const { data, error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "https://alansosar.github.io/login.html",
    }
  });

  if (error) throw error;
  return data;
};

/* ============================================================
   4) GET CURRENT USER (LA VERSIÓN CORRECTA)
   ============================================================ */
window.supabaseAuth.getCurrentUser = async function () {
  // ✔ Publishable Key → SOLO getSession funciona correctamente
  const { data } = await sb.auth.getSession();
  return data?.session?.user || null;
};

/* ============================================================
   5) LOGOUT (EL FIX REAL — Limpia sessionStorage)
   ============================================================ */
window.supabaseAuth.logoutUser = async function () {
  await sb.auth.signOut();

  // 🔥 Importante: GitHub Pages + iOS necesitan limpiar la sesión manualmente
  sessionStorage.removeItem("cortero-session");

  console.log("👋 Sesión cerrada correctamente");

  return true;
};
