// =====================================================
// SUPABASE AUTH — MODO GLOBAL
// =====================================================

const supabase = window.supabaseClient;

// -----------------------------------
// Esperar sesión después del registro
// -----------------------------------
async function esperarSesion() {
  return new Promise(resolve => {
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

// --------------------------
// Subir avatar en Storage
// --------------------------
async function subirFotoBase64(userId, fotoBase64) {
  if (!fotoBase64) return null;

  try {
    const fileName = `${userId}.png`;
    const blob = await (await fetch(fotoBase64)).blob();

    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileName, blob, { upsert: true });

    if (error) return null;

    const { data } = await supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return data.publicUrl;

  } catch {
    return null;
  }
}

// --------------------------
// REGISTRO COMPLETO
// --------------------------
async function registerUser(email, password, phone, fullName, country, fotoBase64=null) {

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, country }
    }
  });

  if (error) throw error;

  const user = data.user;

  await esperarSesion();

  let photoURL = "/imagenes/avatar-default.svg";

  if (fotoBase64) {
    const url = await subirFotoBase64(user.id, fotoBase64);
    if (url) photoURL = url;
  }

  const { error: insertError } = await supabase
    .from("users")
    .insert({
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

// --------------------------
// LOGIN
// --------------------------
async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// --------------------------
// GET CURRENT USER
// --------------------------
async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

// --------------------------
// LOGOUT
// --------------------------
async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  return !error;
}


// =====================================================
// EXPORTAR AL WINDOW COMO API GLOBAL
// =====================================================
window.supabaseAuth = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser
};

console.log("🔐 supabase-auth.js cargado en modo GLOBAL");
