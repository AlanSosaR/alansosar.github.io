// ===========================================
// SUPABASE AUTH — MODO GLOBAL DEFINITIVO
// ===========================================

// usar SIEMPRE el cliente global que crea core-scripts.js
const sb = window.supabaseClient;

// Exponer funciones globales
window.supabaseAuth = {};

console.log("🔥 supabase-auth.js cargado en modo GLOBAL");


// ================================
// ESPERAR SESIÓN LUEGO DE SIGNUP
// ================================
async function esperarSesion() {
  return new Promise((resolve) => {
    let intentos = 0;

    const check = setInterval(async () => {
      const { data } = await sb.auth.getSession();

      if (data.session || intentos > 10) {
        clearInterval(check);
        resolve(data.session);
      }

      intentos++;
    }, 300);
  });
}


// ================================
// SUBIR AVATAR BASE64
// ================================
async function subirFotoBase64(userId, fotoBase64) {
  if (!fotoBase64) return null;

  try {
    const fileName = `${userId}.png`;

    const response = await fetch(fotoBase64);
    const blob = await response.blob();

    const { error: uploadError } = await sb.storage
      .from("avatars")
      .upload(fileName, blob, {
        contentType: blob.type || "image/png",
        upsert: true
      });

    if (uploadError) {
      console.error("⚠️ Error subiendo avatar:", uploadError);
      return null;
    }

    const { data } = await sb.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return data.publicUrl;

  } catch (err) {
    console.error("⚠️ Error procesando base64:", err);
    return null;
  }
}


// ================================
// REGISTRO
// ================================
window.supabaseAuth.registerUser = async function (
  email,
  password,
  phone,
  fullName,
  country,
  fotoBase64 = null
) {

  // 1) Crear usuario en AUTH
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, country }
    }
  });

  if (error) throw error;
  const user = data.user;

  // 2) Esperar sesión
  await esperarSesion();

  // 3) Subir foto si hay
  let photoURL = "/imagenes/avatar-default.svg";

  if (fotoBase64) {
    const url = await subirFotoBase64(user.id, fotoBase64); // ← CORREGIDO
    if (url) photoURL = url;
  }

  // 4) Insertar en tabla USERS
  const { error: insertError } = await sb.from("users").insert({
    id: user.id,
    name: fullName,
    email,
    phone,
    country,
    photo_url: photoURL,
    rol: "usuario"
  });

  if (insertError) throw insertError;

  return data;
};


// ================================
// LOGIN
// ================================
window.supabaseAuth.loginUser = async function (email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
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
