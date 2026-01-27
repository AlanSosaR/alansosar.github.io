// =====================================================
// LAYOUT — HEADER GLOBAL (CORE FINAL LIMPIO)
// =====================================================

console.log("📐 layout.js cargado");

/*
  REGLAS:
  - layout.js SOLO inyecta header
  - NO decide auth
  - NO toca sesión
  - NO toca lógica de usuario
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
    // 3️⃣ DOM READY (ÚNICO)
    // =====================================================
    document.addEventListener("DOMContentLoaded", async () => {

      if (document.getElementById("main-header")) {
        console.warn("⚠️ Header ya existe, no se inyecta");
        return;
      }

      try {
        console.log("📦 layout.js: cargando header.html");

        const HEADER_PATH =
          window.PAGE_MODE?.startsWith("admin")
            ? "../../header.html"   // pages/admin/*
            : "header.html";        // raíz

        const res = await fetch(HEADER_PATH, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`header.html no encontrado (${HEADER_PATH})`);
        }

        const html = await res.text();

        // =====================================================
        // 4️⃣ INYECTAR HEADER
        // =====================================================
        document.body.insertAdjacentHTML("afterbegin", html);
        console.log("✅ Header inyectado");

        // =====================================================
        // 🔔 4.5️⃣ PUSH LISTENER GLOBAL (FIREBASE)
        // =====================================================
        if (!window.__PUSH_LOADED__) {
          window.__PUSH_LOADED__ = true;

          const pushScript = document.createElement("script");
          pushScript.type = "module";
          pushScript.src = "/js/core/push.js";

          document.body.appendChild(pushScript);

          console.log("🔔 push.js cargado globalmente");
        }

        // =====================================================
        // 5️⃣ OCULTAR TODOS LOS TÍTULOS
        // =====================================================
        document.querySelectorAll(".header-cart-title").forEach(el => {
          el.classList.add("hidden");
        });

        // =====================================================
        // 6️⃣ MOSTRAR TÍTULO SEGÚN PÁGINA
        // =====================================================
        if (document.body.classList.contains("page-carrito")) {
          document.getElementById("header-cart-title")?.classList.remove("hidden");
        }

        if (document.body.classList.contains("page-datos-cliente")) {
          document.getElementById("header-datos-title")?.classList.remove("hidden");
        }

        if (document.body.classList.contains("page-recibo")) {
          document.getElementById("header-recibo-title")?.classList.remove("hidden");
        }

        if (document.body.classList.contains("page-mis-pedidos")) {
          document.getElementById("header-mis-pedidos-title")?.classList.remove("hidden");
        }

        if (document.body.classList.contains("page-admin-cafes")) {
          document.getElementById("header-admin-cafes-title")?.classList.remove("hidden");
        }

        if (document.body.classList.contains("page-admin-agregar-cafe")) {
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
        // 7️⃣ INIT HEADER UI
        // =====================================================
        if (typeof window.initHeader === "function") {
          window.initHeader();
          console.log("🧭 initHeader OK");
        }

        // =====================================================
        // 8️⃣ INIT AUTH UI (VISUAL)
        // =====================================================
        if (typeof window.initAuthUI === "function") {
          await window.initAuthUI();
          console.log("🔐 initAuthUI OK");
        }

        // =====================================================
        // 9️⃣ HEADER LISTO
        // =====================================================
        document.dispatchEvent(new Event("header:ready"));
        console.log("📣 Evento header:ready");

      } catch (err) {
        console.error("❌ Error en layout.js:", err);
      }
    });
  }
}
