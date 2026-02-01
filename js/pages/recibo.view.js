/**
 * 🧾 recibo.view.js — FINAL (VIEW ONLY)
 * ---------------------------------------------------------
 * Orquestador de vista — SIN lógica de negocio
 */

console.log("🧾 recibo.view.js — READY");

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  if (!orderId) {
    console.warn("⚠️ recibo.view.js: orderId no encontrado");
    return;
  }

  try {
    /* =====================================================
       ESPERAR CORE
    ===================================================== */
    if (typeof window.esperarSupabase !== "function") {
      await new Promise(resolve => {
        const i = setInterval(() => {
          if (typeof window.esperarSupabase === "function") {
            clearInterval(i);
            resolve();
          }
        }, 50);
      });
    }

    await window.esperarSupabase();

    /* =====================================================
       VALIDAR SESIÓN
    ===================================================== */
    let user = null;
    let tries = 0;

    while (!user && tries < 10) {
      if (typeof window.getUserCache === "function") {
        user = window.getUserCache();
      }
      if (user) break;
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }

    if (!user) {
      console.warn("🔐 Sesión no válida, redirigiendo a login");
      if (!location.pathname.includes("login.html")) {
        location.href = "/pages/auth/login.html";
      }
      return;
    }

    /* =====================================================
       DELEGAR AL CORE
    ===================================================== */
    if (typeof window.cargarPedidoExistente === "function") {
      await window.cargarPedidoExistente(orderId);
    } else {
      console.error("❌ cargarPedidoExistente no disponible");
    }

  } catch (err) {
    console.error("❌ Error en recibo.view.js:", err);
    window.showSnack?.("Error cargando el pedido");
  }
});
