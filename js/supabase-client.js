// ===========================================
// SUPABASE CLIENT — Café Cortero
// FIX DEFINITIVO PARA GITHUB PAGES
// Usa sessionStorage (NO localStorage)
// ===========================================

const { createClient } = supabase;

const SUPABASE_URL = "https://eaipcuvvddyrqkbmjmvw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaXBjdXZ2ZGR5cnFrYm1qbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTcxMDEsImV4cCI6MjA3ODY3MzEwMX0.2qICLx3qZgeGr0oXZ8PYRxXPL1X5Vog4UoOnTQBFzNA";

// 🚫 NO usar localStorage (GitHub Pages/Safari lo bloquean)
// 🟢 SessionStorage 100% compatible
const storage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key)
};

// 🟢 Cliente Supabase global
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: "cortero-session",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log("🔥 supabase-client.js cargado (sessionStorage, sin localStorage)");
