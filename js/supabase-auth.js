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
// REGISTRO (SIN FOTO POR AHORA)
// ================================
window.supabaseAuth.registerUser = async function (
  email,
  password,
  phone,
  fullName,
  country
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

  // 2) Esperar sesión temporal para asegurar creación
  await esperarSesion();

  // 3) Foto por defecto
  const photoURL = "/imagenes/avatar-default.svg";

  // 4) Insertar en tabla USERS (tu tabla REAL)
  const { error: insertError } = await sb.from("users").insert({
    id: user.id,
    name: fullName,
    email,
    phone,
    country,
    photo_url: photoURL,
    rol: "usuario",
    created_at: new Date(),
    updated_at: new Date()
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
