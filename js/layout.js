// =====================================================
// LAYOUT — INYECTAR HEADER GLOBAL (ANTI LOOP FINAL)
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

  // 🔒 GUARD ABSOLUTO:
  // Si el header ya existe, NO volver a inyectar ni inicializar
  if (document.getElementById("main-header")) {
    console.warn("⚠️ layout.js: header ya existe, abortando");
    return;
  }

  try {
    console.log("📦 layout.js: cargando header.html");

    const res = await fetch("header.html", {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error("Header no encontrado");
    }

    const html = await res.text();

    // 🔑 Inyectar SOLO UNA VEZ
    document.body.insertAdjacentHTML("afterbegin", html);

    console.log("✅ Header inyectado");

    // 🔑 Inicializar header
    if (typeof initHeader === "function") {
      initHeader();
    } else {
      console.error("❌ initHeader no disponible");
    }

    // 🔑 Inicializar auth UI
    if (typeof initAuthUI === "function") {
      initAuthUI();
    } else {
      console.error("❌ initAuthUI no disponible");
    }

  } catch (err) {
    console.error("❌ Error en layout.js:", err);
  }
});
