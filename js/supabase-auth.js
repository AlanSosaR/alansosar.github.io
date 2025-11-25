// ===========================================
// SUPABASE AUTH — VERSIÓN ESTABLE
// ===========================================

// usar siempre el cliente creado por core-scripts.js
const sb = window.supabaseClient;

window.supabaseAuth = {};

console.log("🔥 supabase-auth.js cargado — versión estable");


// ===========================================
// ESPERAR SESIÓN LUEGO DE SIGNUP
// ===========================================
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



// ===========================================
// REGISTRO — TOTALMENTE COMPATIBLE CON TU BD
// ===========================================
window.supabaseAuth.registerUser = async function (
  email,
  password,
  phone,
  fullName,
  country = "Honduras"
) {

  console.log("🚀 Registrando usuario…");

  // 1) Crear usuario en AUTH
  const { data, error } = await sb.auth.signUp({
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

  if (error) {
    console.error("❌ Error en signUp:", error);
    throw error;
  }

  const user = data.user;

  // 2) Esperar sesión temporal
  await esperarSesion();

  // 3) Foto por defecto (URL ABSOLUTA)
  const photoURL =
    "https://alansosar.github.io/imagenes/avatar-default.svg";

  // 4) Insertar en tabla users — AHORA TODO COINCIDE
  const now = new Date().toISOString();

  const { error: insertError } = await sb.from("users").insert({
    id: user.id,
    name: fullName,
    email: email,
    phone: phone,
    country: country,
    photo_url: photoURL,
    rol: "usuario",
    created_at: now,
    updated_at: now
  });

  if (insertError) {
    console.error("❌ Error al insertar en users:", insertError);
    throw insertError;
  }

  console.log("🟢 Usuario guardado correctamente en users");

  return data;
};



// ===========================================
// LOGIN NORMAL
// ===========================================
window.supabaseAuth.loginUser = async function (email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};



// ===========================================
// MAGIC LINK
// ===========================================
window.supabaseAuth.loginMagicLink = async function (email) {
  const { data, error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "https://alansosar.github.io/login.html"
    }
  });

  if (error) throw error;
  return data;
};



// ===========================================
// GET USER
// ===========================================
window.supabaseAuth.getCurrentUser = async function () {
  const { data } = await sb.auth.getUser();
  return data.user || null;
};



// ===========================================
// LOGOUT
// ===========================================
window.supabaseAuth.logoutUser = async function () {
  const { error } = await sb.auth.signOut();
  if (error) return false;
  return true;
};
