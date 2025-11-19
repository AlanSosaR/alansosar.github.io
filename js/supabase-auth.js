import { supabase } from "./supabase-client.js";

/* ================================
   SUBIR FOTO BASE64 A SUPABASE
================================ */
async function subirFotoBase64(userId, fotoBase64) {
  if (!fotoBase64) return null;

  try {
    const base64Data = fotoBase64.split(",")[1];
    const fileName = `${userId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, atob(base64Data), {
        contentType: "image/png",
        upsert: true
      });

    if (uploadError) {
      console.error("⚠️ Error subiendo avatar:", uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return data.publicUrl;

  } catch (err) {
    console.error("⚠️ Error procesando base64:", err);
    return null;
  }
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
  // Crear usuario en AUTH
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        country
      }
    }
  });

  if (error) throw error;

  const user = data.user;

  // Subir foto si existe
  let photoURL = "/imagenes/avatar-default.svg";

  if (fotoBase64) {
    const url = await subirFotoBase64(user.id, fotoBase64);
    if (url) photoURL = url;
  }

  // Insertar en tabla USERS
  const { error: insertError } = await supabase.from("users").insert({
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
}

/* ================================
   LOGIN DE USUARIO
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
   OBTENER USUARIO ACTUAL
================================ */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/* ================================
   CERRAR SESIÓN
================================ */
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("⚠️ Error cerrando sesión:", error);
    return false;
  }
  return true;
}
