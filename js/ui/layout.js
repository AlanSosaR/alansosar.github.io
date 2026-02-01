// =====================================================
// LAYOUT — HEADER GLOBAL (CORE FINAL DEFINITIVO)
// =====================================================

console.log("📐 layout.js cargado");

/*
  REGLAS:
  - layout.js orquesta UI global
  - NO decide auth
  - NO se ejecuta en login
*/

if (document.body.dataset.page !== "login") {

  // =====================================================
  // GUARD GLOBAL — EVITA DOBLE EJECUCIÓN
  // =====================================================
  if (!window.__LAYOUT_LOADED__) {
    window.__LAYOUT_LOADED__ = true;

    document.addEventListener("DOMContentLoaded", async () => {

      if (document.getElementById("main-header")) {
        console.warn("⚠️ Header ya existe, abortando inyección");
        return;
      }

      try {
        console.log("📦 layout.js → cargando header.html");

        const HEADER_PATH =
          window.PAGE_MODE?.startsWith("admin")
            ? "/pages/shared/header.html"
            : "/pages/shared/header.html";

        const res = await fetch(HEADER_PATH, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("/pages/shared/header.html no encontrado");
        }

        const html = await res.text();
        document.body.insertAdjacentHTML("afterbegin", html);
        console.log("✅ Header inyectado");

        // ================= PUSH (GLOBAL) =================
        if (!window.__PUSH_LOADED__) {
          window.__PUSH_LOADED__ = true;

          const pushScript = document.createElement("script");
          pushScript.type = "module";
          pushScript.src = "/js/core/push.js";
          document.body.appendChild(pushScript);

          console.log("🔔 push.js cargado globalmente");
        }

        // ================= HEADER UI =================
        if (typeof window.initHeader === "function") {
          window.initHeader();
          console.log("🧭 initHeader OK");
        }

        // ================= AUTH UI =================
        if (typeof window.initAuthUI === "function") {
          await window.initAuthUI();
          console.log("🔐 initAuthUI OK");
        }

        // ================= HEADER READY =================
        document.dispatchEvent(new Event("header:ready"));
        console.log("📣 Evento header:ready");

      } catch (err) {
        console.error("❌ Error crítico en layout.js:", err);
      }
    });

    // =====================================================
    // 🔔 NOTIFICATIONS — ESCUCHA AUTH:READY (CORRECTO)
    // =====================================================
    document.addEventListener("auth:ready", async () => {
      if (window.__NOTIFICATIONS_LOADED__) return;
      window.__NOTIFICATIONS_LOADED__ = true;

      try {
        const sb = window.supabase;
        if (!sb) {
          console.warn("⚠️ Supabase no disponible para notificaciones");
          return;
        }

        const { data } = await sb.auth.getSession();
        const authUser = data?.session?.user;

        if (!authUser) {
          console.warn("⚠️ authUser no disponible para notificaciones");
          return;
        }

        const { initNotifications } = await import(
          "/js/core/notifications.js"
        );

        initNotifications(authUser);
        console.log("🔔 notifications inicializadas (authUser OK)");

      } catch (e) {
        console.error("❌ Error cargando notifications.js", e);
      }
    });

  } else {
    console.warn("⚠️ layout.js ya estaba cargado");
  }
}
