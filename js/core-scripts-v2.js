// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO (GitHub Pages + iOS + Auth)
// ============================================================

const { createClient } = supabase;

// ✔ TU URL REAL
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";

// ✔ ESTA ES TU ANON KEY CORRECTA (NO LA CAMBIES)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ✔ USAR localStorage (sessionStorage se borra en GitHub Pages)
const storage = {
  getItem: (k) => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
  removeItem: (k) => localStorage.removeItem(k),
};

// ✔ CREAR CLIENTE
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage,
    storageKey: "cortero-session"
  }
});

console.log("🔥 Supabase inicializado correctamente con ANON KEY");


// ============================================================
// CARGAR PERFIL GLOBAL (TABLA USERS)
// ============================================================
async function cargarPerfilGlobal(user) {
  if (!user) {
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
    return;
  }

  const sb = window.supabaseClient;

  const { data: perfil, error } = await sb
    .from("users")
    .select("id, name, phone, photo_url, email")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("❌ Error cargando perfil global:", error);
    return;
  }

  const userData = {
    id: perfil.id,
    name: perfil.name || "",
    phone: perfil.phone || "",
    email: perfil.email || user.email,
    photo_url: perfil.photo_url || "imagenes/avatar-default.svg",
  };

  // Guardar perfil en LocalStorage
  localStorage.setItem("cortero_user", JSON.stringify(userData));
  localStorage.setItem("cortero_logged", "1");

  console.log("🟢 Perfil global cargado:", userData);

  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: userData }));
}


// ============================================================
// EVENTOS LOGIN / LOGOUT DE SUPABASE
// ============================================================
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 auth event:", event);

  if (session?.user) {
    await cargarPerfilGlobal(session.user);
  } else {
    localStorage.removeItem("cortero_logged");
    localStorage.removeItem("cortero_user");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});


// ============================================================
// RESTAURAR SESIÓN AL ABRIR UNA PÁGINA
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    await cargarPerfilGlobal(data.session.user);
  } else {
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});
