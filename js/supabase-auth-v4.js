/* ============================================================
   SUPABASE AUTH — VERSIÓN FINAL 2025
   Persistencia REAL con localStorage
   ============================================================ */

console.log("🔥 supabase-auth-v4.js cargado — FIX REAL LOCALSTORAGE");

const sb = window.supabaseClient;
window.supabaseAuth = {};

/* ============================================================
   1) GUARDAR SESIÓN Y PERFIL
   ============================================================ */
async function guardarSesionYPerfil(session) {
  if (!session || !session.user) return;

  localStorage.setItem("cortero-session", JSON.stringify(session));

  const { data: perfil } = await sb
    .from("users")
    .select("id, name, phone, email, photo_url")
    .eq("id", session.user.id)
    .single();

  const userData = {
    id: perfil?.id || session.user.id,
    name: perfil?.name || "",
    phone: perfil?.phone || "",
    email: perfil?.email || session.user.email,
    photo_url: perfil?.photo_url || "imagenes/avatar-default.svg"
  };

  localStorage.setItem("cortero_user", JSON.stringify(userData));
  localStorage.setItem("cortero_logged", "1");

  console.log("🟢 Sesión + perfil guardados:", userData);
}

/* ============================================================
   2) REGISTRO
   ============================================================ */
window.supabaseAuth.registerUser = async function (
  email,
  password,
  phone,
  fullName
) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        country: ""            // ← ← VACÍO como pediste
      }
    }
  });

  if (error) throw error;
  return data;
};

/* ============================================================
   3) LOGIN
   ============================================================ */
window.supabaseAuth.loginUser = async function (email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  await guardarSesionYPerfil(data.session);

  return data;
};

/* ============================================================
   4) Magic link
   ============================================================ */
window.supabaseAuth.loginMagicLink = async function (email) {
  const { data, error } = await sb.auth.signInWithOtp({ email });
  if (error) throw error;
  return data;
};

/* ============================================================
   5) Obtener usuario actual (desde localStorage)
   ============================================================ */
window.supabaseAuth.getCurrentUser = async function () {
  const raw = localStorage.getItem("cortero_user");
  if (!raw) return null;
  return JSON.parse(raw);
};

/* ============================================================
   6) LOGOUT REAL
   ============================================================ */
window.supabaseAuth.logoutUser = async function () {
  await sb.auth.signOut();

  localStorage.removeItem("cortero-session");
  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");

  console.log("👋 Sesión eliminada (localStorage)");
};

/* ============================================================
   7) RESTAURAR SESIÓN AL ABRIR PÁGINA
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await sb.auth.getSession();

  if (data?.session?.user) {
    console.log("♻ Restaurando sesión Supabase…");
    await guardarSesionYPerfil(data.session);
  }
});
