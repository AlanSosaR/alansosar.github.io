import { supabase } from "./supabase-client.js";

/* ================================
   SUBIR FOTO
================================ */
async function subirFotoBase64(userId, fotoBase64) {
  if (!fotoBase64) return null;

  const base64Data = fotoBase64.split(",")[1];
  const fileName = `${userId}.png`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(fileName, atob(base64Data), {
      contentType: "image/png",
      upsert: true
    });

  if (error) {
    console.error("Error subiendo avatar:", error);
    return null;
  }

  return supabase.storage
    .from("avatars")
    .getPublicUrl(fileName).data.publicUrl;
}

/* ================================
   REGISTRO
================================ */
export async function registerUser(
  email,
  password,
  phone,
  fullName,
  country,
  fotoBase64 = null
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, country }
    }
  });

  if (error) throw error;

  const user = data.user;

  // Subir foto
  let photoURL = "/imagenes/avatar-default.svg";
  if (fotoBase64) {
    const url = await subirFotoBase64(user.id, fotoBase64);
    if (url) photoURL = url;
  }

  // Insertar en tabla users
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
   OBTENER USUARIO ACTUAL
================================ */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error obteniendo usuario:", error);
    return null;
  }
  return data.user;
}
