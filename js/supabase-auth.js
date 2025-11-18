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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
        country: country,
        // 👇 Foto de perfil: si no envían foto, usa TU imagen local
        photo_url: photoURL || "/imagenes/avatar-default.svg"
      }
    }
  });

  if (error) throw error;
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
