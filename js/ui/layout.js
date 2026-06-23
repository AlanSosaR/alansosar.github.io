// =====================================================
// LAYOUT — HEADER + FOOTER GLOBAL
// =====================================================

console.log("📐 layout.js cargado");

// =====================================================
// GUARD GLOBAL — EVITA DOBLE EJECUCIÓN
// =====================================================
if (window.__LAYOUT_LOADED__) {
  console.warn("⚠️ layout.js ya estaba cargado");
} else {
  window.__LAYOUT_LOADED__ = true;

  document.addEventListener("DOMContentLoaded", async () => {

    const isLoginPage = document.body.dataset.page === "login";
    const isSimpleFooter = /^\/(pages\/(auth|legal|profile)\/)/.test(window.location.pathname);

    try {
      // ================= INYECTAR HEADER (solo si no es login) =================
      if (!isLoginPage) {
        if (document.getElementById("main-header")) {
          console.warn("⚠️ Header ya existe, abortando inyección");
        } else {
          const headerRes = await fetch("/pages/shared/header.html", { cache: "no-store" });
          if (!headerRes.ok) throw new Error("header.html no encontrado");
          document.body.insertAdjacentHTML("afterbegin", await headerRes.text());

          // Navbar transparente solo en home
          const isHomePage = window.location.pathname === '/pages/home/index.html' || window.location.pathname === '/pages/home/';
          if (isHomePage) {
            const header = document.getElementById("main-header");
            if (header) header.classList.add("navbar-transparent");
            document.body.classList.add("home-page");
          }

          console.log("✅ Header inyectado");
        }
      }

      // ================= INYECTAR FOOTER (excepto login) =================
      if (!isLoginPage && !document.getElementById("site-footer")) {
        const footerRes = await fetch("/pages/shared/footer.html", { cache: "no-store" });
        if (!footerRes.ok) throw new Error("footer.html no encontrado");
        const footerHtml = await footerRes.text();
        const template = document.createElement("template");
        template.innerHTML = footerHtml.trim();
        const footerEl = template.content.firstElementChild;
        if (isSimpleFooter) {
          footerEl.classList.add("footer-simple");
        }
        document.body.appendChild(footerEl);
        console.log("✅ Footer inyectado" + (isSimpleFooter ? " (simplificado)" : ""));
      }

      // ================= PUSH (GLOBAL) =================
      if (!window.__PUSH_LOADED__) {
        window.__PUSH_LOADED__ = true;
        const pushScript = document.createElement("script");
        pushScript.type = "module";
        pushScript.src = "/js/core/push.js";
        document.body.appendChild(pushScript);
        console.log("🔔 push.js cargado globalmente");
      }

      // ================= HEADER UI (solo si hay header) =================
      if (!isLoginPage) {
        if (typeof window.initHeader === "function") {
          window.initHeader();
          console.log("🧭 initHeader OK");
        }
        if (typeof window.initAuthUI === "function") {
          await window.initAuthUI();
          console.log("🔐 initAuthUI OK");
        }
        document.dispatchEvent(new Event("header:ready"));
        console.log("📣 Evento header:ready");
      }

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

}
