// ============================================================
// SUPABASE CLIENT — FINAL DEFINITIVO 2025 (LOGOUT FIXED)
// ÚNICA FUENTE DE VERDAD PARA AUTH
// ============================================================

console.log("🔥 SUPABASE CLIENT — FINAL DEFINITIVO 2025");

// ------------------------------------------------------------
// 1) SDK ya cargado en HTML
// ------------------------------------------------------------
const { createClient } = window.supabase;

// ------------------------------------------------------------
// 2) Credenciales
// ------------------------------------------------------------
const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// ------------------------------------------------------------
// 3) Storage seguro
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

// ============================================================
// 5) PERFIL GLOBAL
// ============================================================
async function cargarPerfilGlobal(user) {
  if (!user) return;

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
// 6) LOGOUT TOTAL (FIX REAL)
// ============================================================
async function logoutTotal() {
  console.log("🚪 Logout total");

  // 1️⃣ Cerrar sesión Supabase
  await window.supabaseClient.auth.signOut();

  // 2️⃣ LIMPIAR TODO rastro local
  localStorage.removeItem("cortero_user");
  localStorage.removeItem("cortero_logged");
  localStorage.removeItem("cortero.session.v2");

  // 3️⃣ Notificar UI
  document.dispatchEvent(new CustomEvent("userLoggedOut"));

  // 4️⃣ Redirección controlada
  window.location.href = "/index.html";
}
window.corteroLogout = logoutTotal;

// ============================================================
// 7) AUTH STATE — SOLO SIN REDIRECCIONES
// ============================================================
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
    console.log("👋 Sesión cerrada");
  }
});

// ============================================================
// 8) CONEXIÓN CON HEADER (UI)
// ============================================================

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
