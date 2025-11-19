// ===========================================
// SUPABASE AUTH — MODO GLOBAL
// ===========================================

// Usar el cliente global cargado en supabase-client.js
const supabase = window.supabaseClient;

/* ================================
   ESPERAR LA SESIÓN TRAS SIGNUP
================================ */
async function esperarSesion() {
  return new Promise((resolve) => {
    let intentos = 0;

    const check = setInterval(async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session || intentos > 10) {
        clearInterval(check);
        resolve(data.session);
      }

      intentos++;
    }, 300);
  });
}

/* ================================
   SUBIR FOTO BASE64
================================ */
async function subirFotoBase64(userId, fotoBase64) {
  if (!fotoBase64) return null;

  try {
    const fileName = `${userId}.png`;

    const response = await fetch(fotoBase64);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, blob, {
        contentType: blob.type || "image/png",
        upsert: true
      });

    if (uploadError) {
      console.error("⚠️ Error subiendo avatar:", uploadError);
      return null;
    }

    const { data } = await supabase.storage
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
  // 1️⃣ Crear usuario en AUTH
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, country }
    }
  });

  if (error) throw error;
  const user = data.user;

  // 2️⃣ Esperar sesión
  console.log("⏳ Esperando sesión Supabase...");
  await esperarSesion();

  // 3️⃣ Subir avatar
  let photoURL = "/imagenes/avatar-default.svg";

  if (fotoBase64) {
    const url = await subirFotoBase64(user.id, fotoBase64);
    if (url) photoURL = url;
  }

  // 4️⃣ Insertar en tabla "users"
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
   GET USER
================================ */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

/* ================================
   LOGOUT
================================ */
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("⚠️ Error cerrando sesión:", error);
    return false;
  }
  return true;
}
