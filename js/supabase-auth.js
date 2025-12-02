/* ============================================================
   SUPABASE AUTH — VERSIÓN FINAL 2025
   Registro: primero Auth → luego inserción en tabla users.
   Login, logout y datos 100% compatibles con perfil.
============================================================ */

console.log("🔥 supabase-auth.js cargado — versión FINAL 2025");

const sb = window.supabaseClient;

// Namespace global
window.supabaseAuth = {};

/* ============================================================
   1) REGISTRO — FLUJO CORREGIDO:
      ✔ Primero crear usuario en Auth (UID real)
      ✔ Luego insertar en tabla users con ese UID
      ✔ Envío automático de correo de verificación
============================================================ */
window.supabaseAuth.registerUser = async function (email, password, phone, fullName) {

  console.log("🟡 Paso 1: Creando usuario en Auth…");

  const { data: authData, error: authError } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + "/login.html",
      data: {
        full_name: fullName || "",
        phone: phone || ""
      }
    }
  });

  if (authError) {
    console.error("❌ Error creando usuario en Auth:", authError);
    throw authError;
  }

  // UID REAL DEL USUARIO
  const authUid = authData?.user?.id;
  if (!authUid) {
    console.error("❌ No se pudo obtener el UID del usuario.");
    throw new Error("No UID.");
  }

  console.log("🟢 UID creado:", authUid);
  console.log("🟡 Paso 2: Insertando en tabla users…");

  const { data: insertedUser, error: insertError } = await sb
    .from("users")
    .insert({
      id: authUid,               // <— importante: vincula Auth con tabla users
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

    // Eliminamos el usuario de AUTH si falla el INSERT
    try {
      await sb.auth.admin.deleteUser(authUid);
    } catch (e) {
      console.warn("⚠ No se pudo eliminar el usuario creado en Auth:", e);
    }

    throw insertError;
  }

  console.log("✅ Usuario insertado correctamente:", insertedUser);
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
