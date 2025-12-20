// =====================================================
// LAYOUT — INYECTAR HEADER GLOBAL
// VERSIÓN FINAL, ESTABLE, ANTI LOOP
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

  // 🔒 GUARD CRÍTICO:
  // Si el header ya existe, NO volver a inyectar ni inicializar nada
  if (document.getElementById("main-header")) {
    console.warn("⚠️ layout.js: header ya existe, abortando ejecución");
    return;
  }

  try {
    console.log("📦 layout.js: cargando header.html…");

    const res = await fetch("header.html", {
      cache: "no-store" // evita cache raro en desarrollo
    });

    if (!res.ok) {
      throw new Error("Header no encontrado");
    }

    const html = await res.text();

    // 🔑 Inyectar el header SOLO UNA VEZ
    document.body.insertAdjacentHTML("afterbegin", html);

    console.log("✅ Header inyectado correctamente");

    // 🔑 Inicializar HEADER
    if (typeof initHeader === "function") {
      initHeader();
    } else {
      console.error("❌ initHeader() no está disponible");
    }

    // 🔑 Inicializar AUTH UI
    if (typeof initAuthUI === "function") {
      initAuthUI();
    } else {
      console.error("❌ initAuthUI() no está disponible");
    }

  } catch (err) {
    console.error("❌ Error cargando layout/header:", err);
  }
});
