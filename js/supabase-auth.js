// supabase-auth.js
import { supabase } from "./supabase-client.js";

/* ================================
   SUBIR FOTO A STORAGE (si existe)
================================ */
async function subirFotoBase64(userId, fotoBase64) {
  if (!fotoBase64) return null;

  const base64Data = fotoBase64.split(",")[1];
  const fileName = `${userId}.png`;

  // Convertir base64 a binario
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  // Subir a storage
  const { error } = await supabase.storage
    .from("avatars")
    .upload(fileName, byteArray, {
      contentType: "image/png",
      upsert: true
    });

  if (error) {
    console.error("❌ Error subiendo avatar:", error);
    return null;
  }

  // Obtener URL pública
  const { data } = supabase
    .storage
    .from("avatars")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/* ================================
   REGISTRO DE USUARIO
================================ */
export async function registerUser(
  email,
  password,
  phone,
  fullName,
  country,
  fotoBase64 = null
) {

  // 1️⃣ Crear usuario en Auth
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
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

  if (signupError) {
    console.error("❌ Error en signUp:", signupError);
    throw signupError;
  }

  // 2️⃣ Iniciar sesión inmediatamente (ACTIVA auth.uid())
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (loginError) {
    console.error("❌ Error iniciando sesión después del signUp:", loginError);
    throw loginError;
  }

  // 3️⃣ Obtener usuario ya autenticado
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    throw new Error("No se pudo obtener el usuario después del login.");
  }

  // 4️⃣ Subir foto al storage si existe
  let photoURL = "/imagenes/avatar-default.svg";

  if (fotoBase64) {
    const uploadedUrl = await subirFotoBase64(user.id, fotoBase64);
    if (uploadedUrl) photoURL = uploadedUrl;
  }

  // 5️⃣ Insertar usuario en la tabla "users"
  const { error: insertError } = await supabase.from("users").insert({
    id: user.id,
    name: fullName,
    email: email,
    phone: phone,
    country: country,
    photo_url: photoURL,
    rol: "usuario"
  });

  if (insertError) {
    console.error("❌ Error insertando en tabla users:", insertError);
    throw insertError;
  }

  return signupData;
}

/* ================================
   LOGIN
================================ */
export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

/* ================================
   LOGOUT
================================ */
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/* ================================
   OBTENER USUARIO ACTUAL
================================ */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
