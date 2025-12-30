// ============================================================
// SUPABASE CLIENT — VERSIÓN FINAL ESTABLE 2025 (CORREGIDA)
// ÚNICA FUENTE DE VERDAD PARA AUTH
// ============================================================

console.log("🔥 SUPABASE CLIENT — FINAL LIMPIO 2025");

// ------------------------------------------------------------
// 1) SDK de Supabase ya cargado desde index.html
// ------------------------------------------------------------
const { createClient } = window.supabase;

// ------------------------------------------------------------
// 2) Credenciales del proyecto
// ------------------------------------------------------------
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ------------------------------------------------------------
// 3) Persistencia segura
// ------------------------------------------------------------
const storage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch {} }
};

// ------------------------------------------------------------
// 4) Crear cliente Supabase
// ------------------------------------------------------------
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "cortero.session.v2",
    storage
  }
});

// Alias global
window.supabase = window.supabaseClient;

// ------------------------------------------------------------
// 5) Cargar perfil global (tabla users)
// ------------------------------------------------------------
async function cargarPerfilGlobal(user) {
  if (!user) return;

  console.log("📥 Cargando perfil:", user.id);

  const { data, error } = await window.supabaseClient
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("❌ Error perfil:", error);
    return;
  }

  localStorage.setItem("cortero_user", JSON.stringify(data));
  localStorage.setItem("cortero_logged", "1");

  document.dispatchEvent(
    new CustomEvent("userLoggedIn", { detail: data })
  );
}

// ============================================================
// 6 + 7) LOGOUT + AUTH STATE — FINAL
// ============================================================

// 6) Logout: solo signOut
async function logoutTotal() {
  console.log("🚪 Logout total");
  await window.supabaseClient.auth.signOut();
}
window.corteroLogout = logoutTotal;

// 7) Auth state: fuente única de verdad
window.supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("🔐 Auth event:", event);

  if (
    (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
    session?.user
  ) {
    cargarPerfilGlobal(session.user);
    return;
  }

  if (event === "SIGNED_OUT") {
    localStorage.removeItem("cortero_user");
    localStorage.removeItem("cortero_logged");
    document.dispatchEvent(new CustomEvent("userLoggedOut"));

    if (!location.pathname.endsWith("index.html")) {
      window.location.href = "/index.html";
    }
  }
});

// ------------------------------------------------------------
// 8) CONECTAR SESIÓN CON HEADER (UI)
// ------------------------------------------------------------

// Usuario logueado
document.addEventListener("userLoggedIn", () => {
  const header = document.querySelector(".header-fixed");
  header?.classList.add("logged");
  header?.classList.remove("no-user");
});

// Usuario invitado
document.addEventListener("userLoggedOut", () => {
  const header = document.querySelector(".header-fixed");
  header?.classList.remove("logged");
  header?.classList.add("no-user");
});
