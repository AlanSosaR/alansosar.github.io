/* ============================================================
   SUPABASE AUTH — VERSIÓN FINAL 2025
   Registro: primero inserta en tabla users, luego crea Auth.
   Login, logout y datos 100% compatibles con perfil
============================================================ */

console.log("🔥 supabase-auth.js cargado — versión FINAL 2025");

const sb = window.supabaseClient;

// Namespace global
window.supabaseAuth = {};

/* ============================================================
   1) REGISTRO — NUEVO FLUJO:
      ✔ Inserta en tabla users primero
      ✔ Luego crea Auth
      ✔ Luego envía correo de verificación
============================================================ */
window.supabaseAuth.registerUser = async function (email, password, phone, fullName) {

  console.log("🟡 Paso 1: Insertando fila en tabla users…");

  // 1) INSERTAR EN TABLA USERS — como pediste
  const { data: insertedUser, error: insertError } = await sb
    .from("users")
    .insert({
      email: email,
      phone: phone,
      name: fullName,
      country: "Honduras",
      photo_url: null,
      created_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("❌ Error insertando en tabla users:", insertError);
    throw insertError;
  }

  console.log("✅ Usuario insertado en tabla users:", insertedUser);

  // 2) CREAR USUARIO EN AUTH
  console.log("🟡 Paso 2: Creando usuario en Auth…");

  const { data: authData, error: authError } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + "/login.html",
      data: {
        full_name: fullName || "",
        phone: phone || "",
        user_table_id: insertedUser.id    // <— vínculo entre tabla users y auth
      }
    }
  });

  if (authError) {
    console.error("❌ Error creando usuario en Auth:", authError);

    // Si falla Auth devolvemos el INSERT para que no queden usuarios huérfanos
    await sb.from("users").delete().eq("id", insertedUser.id);

    throw authError;
  }

  console.log("📩 Correo de verificación enviado a:", email);

  return {
    user_table: insertedUser,
    auth: authData
  };
};

/* ============================================================
   2) LOGIN — Iniciar sesión normal
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
   3) LOGIN — Magic Link
============================================================ */
window.supabaseAuth.loginMagicLink = async function (email) {
  const { data, error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + "/login.html"
    }
  });

  if (error) throw error;
  return data;
};

/* ============================================================
   4) Obtener usuario desde LocalStorage
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
