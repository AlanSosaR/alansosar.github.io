/* ============================================================
   SUPABASE AUTH — VERSIÓN FINAL 2025
   ✔ Registro: primero Auth (signUp) → trigger llena tabla users
   ✔ Envía correo de verificación
   ✔ Envía foto por defecto y metadatos (name, phone, country, rol)
   ✔ Login / logout compatibles con perfil y menú
============================================================ */

console.log("🔥 supabase-auth.js cargado — versión AUTH-FIRST FINAL 2025");

const sb = window.supabaseClient;

// Namespace global
window.supabaseAuth = {};

/* ============================================================
   1) REGISTRO — NUEVO FLUJO CORRECTO:
      ✔ Crea usuario en Auth (manda correo)
      ✔ Trigger se encarga de insertar en tabla users
============================================================ */
window.supabaseAuth.registerUser = async function (
  email,
  password,
  phone,
  fullName,
  country = "Honduras",
  photoUrl = "/imagenes/avatar-default.svg"
) {
  console.log("🟡 REGISTRO: creando usuario en Supabase Auth…");

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      // URL a donde redirige cuando el usuario confirma el correo
      emailRedirectTo: window.location.origin + "/login.html",
      // Metadatos que leerá el trigger en auth.users.raw_user_meta_data
      data: {
        name: fullName,
        phone: phone,
        country: country,
        photo_url: photoUrl,
        rol: "cliente"
      }
    }
  });

  if (error) {
    console.error("❌ Error creando usuario en Auth:", error);
    throw error;
  }

  if (data?.user) {
    console.log("✅ Usuario creado en Auth:", data.user.id);
    console.log("📨 Supabase enviará correo de verificación (si el correo existe de verdad).");
  } else {
    console.warn("⚠ signUp no devolvió user, revisar configuración de Auth.");
  }

  // IMPORTANTE:
  // El trigger handle_new_auth_user() creará la fila en public.users
  return data;
};

/* ============================================================
   2) LOGIN — Iniciar sesión normal (email + password)
============================================================ */
window.supabaseAuth.loginUser = async function (email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("❌ Error Login:", error);
    throw error;
  }

  return data;
};

/* ============================================================
   3) LOGIN — Magic Link (OTP por correo)
============================================================ */
window.supabaseAuth.loginMagicLink = async function (email) {
  const { data, error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + "/login.html"
    }
  });

  if (error) {
    console.error("❌ Error login Magic Link:", error);
    throw error;
  }

  return data;
};

/* ============================================================
   4) Obtener usuario desde LocalStorage (perfil cacheado)
============================================================ */
window.supabaseAuth.getCurrentUser = function () {
  try {
    const raw = localStorage.getItem("cortero_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/* ============================================================
   5) LOGOUT
============================================================ */
window.supabaseAuth.logoutUser = async function () {
  try {
    await sb.auth.signOut();
  } catch (e) {
    console.warn("⚠ Error en logout:", e);
  }

  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");

  console.log("👋 Sesión cerrada correctamente");
};
