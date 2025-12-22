// =====================================================
// LAYOUT — HEADER GLOBAL (CORE FINAL SIN LOOP)
// =====================================================

console.log("📐 layout.js cargado");

/*
  REGLAS:
  - layout.js SOLO inyecta header
  - NO decide auth
  - NO toca sesión
  - NO toca UI de usuario
  - NO se ejecuta en login.html
*/

// =====================================================
// 1️⃣ BLOQUEO ABSOLUTO EN LOGIN
// =====================================================
if (document.body.dataset.page === "login") {
  console.warn("⛔ layout.js deshabilitado (página login)");
} else {

  // =====================================================
  // 2️⃣ GUARD GLOBAL — EVITA DOBLE EJECUCIÓN
  // =====================================================
  if (window.__LAYOUT_LOADED__) {
    console.warn("⚠️ layout.js ya ejecutado, abortando");
  } else {
    window.__LAYOUT_LOADED__ = true;

    // =====================================================
    // 3️⃣ DOM READY
    // =====================================================
    document.addEventListener("DOMContentLoaded", async () => {

      // 🔒 Si el header ya existe, NO hacer nada
      if (document.getElementById("main-header")) {
        console.warn("⚠️ Header ya existe en DOM, no se inyecta");
        return;
      }

      try {
        console.log("📦 layout.js: cargando header.html");

        const res = await fetch("header.html", {
          cache: "no-store"
        });

        if (!res.ok) {
          throw new Error("header.html no encontrado");
        }

        const html = await res.text();

        // =====================================================
        // 4️⃣ INYECTAR HEADER (UNA SOLA VEZ)
        // =====================================================
        document.body.insertAdjacentHTML("afterbegin", html);
        console.log("✅ Header inyectado");

        // =====================================================
        // 5️⃣ INIT HEADER (EVENTOS + AUTH INTERNO)
        // =====================================================
        if (typeof window.initHeader === "function") {
          window.initHeader();
          console.log("🧭 initHeader OK");
        } else {
          console.warn("⚠️ initHeader no existe");
        }

      } catch (err) {
        console.error("❌ Error en layout.js:", err);
      }
    });
  }
}
