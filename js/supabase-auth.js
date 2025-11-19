import { supabase } from "./supabase-client.js";

/* ================================
   SUBIR FOTO A STORAGE (si existe)
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

  const { publicUrl } = supabase
    .storage
    .from("avatars")
    .getPublicUrl(fileName).data;

  return publicUrl;
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
  const { data, error } = await supabase.auth.signUp({
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

  if (error) throw error;

  const user = data.user;

  // 2️⃣ ACTIVAR SESIÓN antes del insert (soluciona el error 401)
  await supabase.auth.refreshSession();

  // 3️⃣ Subir foto al storage si existe
  let photoURL = "/imagenes/avatar-default.svg";
  if (fotoBase64) {
    const url = await subirFotoBase64(user.id, fotoBase64);
    if (url) photoURL = url;
  }

  // 4️⃣ Insertar usuario en la tabla "users"
  const { error: insertError } = await supabase.from("users").insert({
    id: user.id,
    name: fullName,
    email: email,
    phone: phone,
    country: country,
    photo_url: photoURL,
    rol: "usuario"
  });

  if (insertError) throw insertError;

  return data;
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
