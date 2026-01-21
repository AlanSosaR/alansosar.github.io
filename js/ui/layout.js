// =====================================================
// LAYOUT — HEADER GLOBAL (CORE FINAL ESTABLE)
// =====================================================

console.log("📐 layout.js cargado");

/*
  REGLAS:
  - layout.js SOLO inyecta header
  - layout.js es el ÚNICO que llama initHeader()
  - NO decide auth
  - NO toca sesión
  - NO se ejecuta en login.html
*/

// =====================================================
// 1️⃣ BLOQUEO ABSOLUTO EN LOGIN
// =====================================================
if (document.body.dataset.page === "login") {
  console.warn("⛔ layout.js deshabilitado (página login)");
  return;
}

// =====================================================
// 2️⃣ GUARD GLOBAL — EVITA DOBLE EJECUCIÓN
// =====================================================
if (window.__LAYOUT_LOADED__) {
  console.warn("⚠️ layout.js ya ejecutado, abortando");
  return;
}
window.__LAYOUT_LOADED__ = true;

// =====================================================
// 3️⃣ UTIL — ESPERAR FUNCIÓN
// =====================================================
function waitFor(fn, interval = 30, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (typeof fn === "function") {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error("Timeout esperando función"));
      } else {
        setTimeout(check, interval);
      }
    };
    check();
  });
}

// =====================================================
// 4️⃣ MAIN
// =====================================================
(async () => {
  try {
    console.log("📦 layout.js: cargando header.html");

    const HEADER_PATH =
      window.PAGE_MODE?.startsWith("admin")
        ? "../../header.html"
        : "header.html";

    const res = await fetch(HEADER_PATH, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`header.html no encontrado (${HEADER_PATH})`);
    }

    const html = await res.text();

    // =====================================================
    // 5️⃣ INYECTAR HEADER
    // =====================================================
    document.body.insertAdjacentHTML("afterbegin", html);
    console.log("✅ Header inyectado");

    // =====================================================
    // 6️⃣ TÍTULOS POR PÁGINA
    // =====================================================
    document.querySelectorAll(".header-cart-title").forEach(el =>
      el.classList.add("hidden")
    );

    const body = document.body;

    if (body.classList.contains("page-carrito")) {
      document.getElementById("header-cart-title")?.classList.remove("hidden");
    }
    if (body.classList.contains("page-datos-cliente")) {
      document.getElementById("header-datos-title")?.classList.remove("hidden");
    }
    if (body.classList.contains("page-recibo")) {
      document.getElementById("header-recibo-title")?.classList.remove("hidden");
    }
    if (body.classList.contains("page-mis-pedidos")) {
      document.getElementById("header-mis-pedidos-title")?.classList.remove("hidden");
    }
    if (body.classList.contains("page-admin-cafes")) {
      document.getElementById("header-admin-cafes-title")?.classList.remove("hidden");
    }
    if (body.classList.contains("page-admin-agregar-cafe")) {
      const isEdit = new URLSearchParams(location.search).has("id");
      document
        .getElementById(
          isEdit
            ? "header-admin-edit-cafe-title"
            : "header-admin-add-cafe-title"
        )
        ?.classList.remove("hidden");
    }

    // =====================================================
    // 7️⃣ ESPERAR A header.js
    // =====================================================
    await waitFor(window.initHeader);

    // =====================================================
    // 8️⃣ INIT HEADER (UNA SOLA VEZ)
    // =====================================================
    window.initHeader();
    console.log("🧭 initHeader OK");

    // =====================================================
    // 9️⃣ INIT AUTH UI (VISUAL)
    // =====================================================
    if (typeof window.initAuthUI === "function") {
      await window.initAuthUI();
      console.log("🔐 initAuthUI OK");
    }

    // =====================================================
    // 🔟 HEADER LISTO
    // =====================================================
    document.dispatchEvent(new Event("header:ready"));
    console.log("📣 Evento header:ready");

  } catch (err) {
    console.error("❌ Error en layout.js:", err);
  }
})();
