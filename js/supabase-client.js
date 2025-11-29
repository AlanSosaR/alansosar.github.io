// ============================================================
// SUPABASE CLIENT — FIX DEFINITIVO 2025
// Persistencia real (localStorage) + Perfil global + Eventos
// ============================================================

const { createClient } = supabase;

// ✔ URL REAL
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";

// ✔ ANON KEY CORRECTA (NO CAMBIAR)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ✔ Storage 100% compatible con GitHub + iOS
const storage = {
  getItem: (k) => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
  removeItem: (k) => localStorage.removeItem(k)
};

// ✔ Crear cliente global Supabase
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage,
    storageKey: "cortero-session"
  }
});

console.log("🔥 Supabase inicializado con persistencia real");


// ============================================================
// CARGAR PERFIL GLOBAL
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
    photo_url: perfil.photo_url || "imagenes/avatar-default.svg"
  };

  // Guardar perfil local
  localStorage.setItem("cortero_user", JSON.stringify(userData));
  localStorage.setItem("cortero_logged", "1");

  console.log("🟢 Perfil cargado:", userData);

  document.dispatchEvent(new CustomEvent("userLoggedIn", { detail: userData }));
}



// ============================================================
// LISTEN AUTH EVENTS
// ============================================================
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("🔄 Auth event:", event);

  if (session?.user) {
    await cargarPerfilGlobal(session.user);
  } else {
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");

    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});


// ============================================================
// RESTAURAR SESIÓN AL ABRIR PÁGINA
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (data?.session?.user) {
    console.log("♻ Restaurando sesión...");
    await cargarPerfilGlobal(data.session.user);
  } else {
    document.dispatchEvent(new CustomEvent("userLoggedOut"));
  }
});
