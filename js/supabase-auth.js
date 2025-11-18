// supabase-auth.js
import { supabase } from "./supabase-client.js";

/* ================================
   REGISTRO DE USUARIO
================================ */
export async function registerUser(
  email,
  password,
  phone,
  fullName,
  country,
  photoURL = null
) {

  // 1️⃣ Crear usuario en Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
        country: country,
        photo_url: photoURL || "/imagenes/avatar-default.svg"
      }
    }
  });

  if (error) throw error;

  const user = data.user;  // <-- UID del usuario creado

  // 2️⃣ Insertarlo en la tabla users
  const { error: insertError } = await supabase.from("users").insert({
    id: user.id,          // UID de Auth
    name: fullName,
    email: email,
    phone: phone,
    country: country,
    photo_url: photoURL || "/imagenes/avatar-default.svg",
    rol: "usuario"        // 👈 rol por defecto
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
