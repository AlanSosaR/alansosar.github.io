// =====================================================
// LAYOUT — HEADER GLOBAL (CORE FINAL DEFINITIVO)
// =====================================================

console.log("📐 layout.js cargado");

/*
  REGLAS:
  - layout.js orquesta el UI global
  - Inyecta header
  - Inicializa UI dependiente del header
  - Dispara notificaciones SOLO UNA VEZ
  - NO contiene lógica de negocio
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
    return;
  }
  window.__LAYOUT_LOADED__ = true;

  // =====================================================
  // 3️⃣ DOM READY (ÚNICO PUNTO DE ENTRADA)
  // =====================================================
  document.addEventListener("DOMContentLoaded", async () => {

    // -------------------------------------------------
    // Guard extra por si el header ya existe
    // -------------------------------------------------
    if (document.getElementById("main-header")) {
      console.warn("⚠️ Header ya existe, no se inyecta");
      return;
    }

    try {
      // =================================================
      // 4️⃣ CARGAR HEADER HTML
      // =================================================
      console.log("📦 layout.js → cargando header.html");

      const HEADER_PATH =
        window.PAGE_MODE?.startsWith("admin")
          ? "../../header.html"
          : "header.html";

      const res = await fetch(HEADER_PATH, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`header.html no encontrado (${HEADER_PATH})`);
      }

      const html = await res.text();

      document.body.insertAdjacentHTML("afterbegin", html);
      console.log("✅ Header inyectado");

      // =================================================
      // 5️⃣ PUSH GLOBAL (FIREBASE) — UNA SOLA VEZ
      // =================================================
      if (!window.__PUSH_LOADED__) {
        window.__PUSH_LOADED__ = true;

        const pushScript = document.createElement("script");
        pushScript.type = "module";
        pushScript.src = "/js/core/push.js";

        document.body.appendChild(pushScript);
        console.log("🔔 push.js cargado globalmente");
      }

      // =================================================
      // 6️⃣ CONTROL DE TÍTULOS DEL HEADER
      // =================================================
      document.querySelectorAll(".header-cart-title")
        .forEach(el => el.classList.add("hidden"));

      const pageMap = [
        ["page-carrito", "header-cart-title"],
        ["page-datos-cliente", "header-datos-title"],
        ["page-recibo", "header-recibo-title"],
        ["page-mis-pedidos", "header-mis-pedidos-title"],
        ["page-admin-cafes", "header-admin-cafes-title"],
      ];

      pageMap.forEach(([cls, id]) => {
        if (document.body.classList.contains(cls)) {
          document.getElementById(id)?.classList.remove("hidden");
        }
      });

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

      // =================================================
      // 7️⃣ INIT HEADER UI
      // =================================================
      if (typeof window.initHeader === "function") {
        window.initHeader();
        console.log("🧭 initHeader OK");
      }

      // =================================================
      // 8️⃣ INIT AUTH UI (VISUAL / SESIÓN)
      // =================================================
      if (typeof window.initAuthUI === "function") {
        await window.initAuthUI();
        console.log("🔐 initAuthUI OK");
      }

      // =================================================
      // 9️⃣ HEADER LISTO (EVENTO GLOBAL)
      // =================================================
      document.dispatchEvent(new Event("header:ready"));
      console.log("📣 Evento header:ready");

      // =================================================
      // 🔔 10️⃣ INIT NOTIFICATIONS (ÚNICO PUNTO VÁLIDO)
      // =================================================
      if (window.currentUser && !window.__NOTIFICATIONS_LOADED__) {
        window.__NOTIFICATIONS_LOADED__ = true;

        const { initNotifications } = await import(
          "/js/core/notifications.js"
        );

        initNotifications();
        console.log("🔔 Notifications inicializadas desde layout");
      } else {
        console.warn("⛔ Notificaciones omitidas (sin usuario o ya cargadas)");
      }

    } catch (err) {
      console.error("❌ Error crítico en layout.js:", err);
    }
  });
}
