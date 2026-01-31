/**
 * 🧾 recibo.view.js — FINAL MATERIAL 3 (ESTABLE)
 * ---------------------------------------------------------
 */

console.log("🧾 recibo.view.js — Iniciando");

document.addEventListener("DOMContentLoaded", () => {

  // 1. Obtener ID de la URL de forma independiente para evitar fallos del Core
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  // Si no hay ID, estamos en modo Checkout (creación), este script no debe hacer nada.
  if (!orderId) {
    console.log("🛒 Modo checkout detectado. recibo.view.js en espera.");
    return;
  }

  (async function initView() {
    try {
      // ⏳ Esperar conexión a Supabase
      if (typeof window.esperarSupabase === "function") {
        await window.esperarSupabase();
      }

      /**
       * 🛠️ VALIDACIÓN DE USUARIO CORREGIDA
       * Intentamos obtener el usuario desde el Core, si falla, buscamos en localStorage directamente
       */
      let user = null;
      if (typeof window.getUserCache === "function") {
          user = window.getUserCache();
      } else {
          // Fallback de emergencia si el Core no ha cargado la función
          const sessionKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
          const sessionData = sessionKey ? JSON.parse(localStorage.getItem(sessionKey)) : null;
          user = sessionData?.user || null;
      }

      // Si después de los intentos no hay usuario, mandamos a login con un pequeño delay
      if (!user) {
        console.warn("🔐 Usuario no encontrado. Redirigiendo...");
        setTimeout(() => { location.href = "login.html"; }, 800);
        return;
      }

      // 👁️ UI: Aplicar modo recibo (Ocultar selectores de pago y botón 'Enviar')
      // Forzamos la ejecución si la función existe en el Core
      if (typeof window.aplicarModoRecibo === "function") {
        window.aplicarModoRecibo();
      } else {
        // Fallback manual si el Core no tiene la función
        const btnEnviar = document.querySelector(".recibo-botones");
        const selectPago = document.querySelector(".pago-select-label");
        if (btnEnviar) btnEnviar.classList.add("hidden");
        if (selectPago) selectPago.classList.add("hidden");
      }

      // 🧾 Cargar pedido desde Supabase
      if (typeof window.cargarPedidoExistente === "function") {
        await window.cargarPedidoExistente(orderId);
      }

      // ⚡ Configurar botón cancelar
      configurarAccionCancelar(orderId);

    } catch (err) {
      console.error("❌ Error en initView:", err);
    }
  })();
});

/* =========================================================
   LÓGICA DE CANCELACIÓN
========================================================= */
function configurarAccionCancelar(orderId) {
  const btnCancelar = document.getElementById("btnCancelarPedido");
  if (!btnCancelar) return;

  btnCancelar.onclick = async () => {
    const confirmar = confirm("¿Estás seguro de que deseas cancelar este pedido?");
    
    if (confirmar) {
      try {
        const sb = window.supabaseClient;
        btnCancelar.disabled = true;
        btnCancelar.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Cancelando...`;

        const { error } = await sb
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", orderId);

        if (error) throw error;

        // Feedback al usuario y recarga de datos
        if (typeof window.showSnack === "function") {
            window.showSnack("Pedido cancelado");
        }
        
        if (typeof window.cargarPedidoExistente === "function") {
            await window.cargarPedidoExistente(orderId);
        }

      } catch (err) {
        console.error("Error al cancelar:", err);
        btnCancelar.disabled = false;
        btnCancelar.innerHTML = `<span class="material-symbols-outlined">cancel</span> Cancelar Pedido`;
      }
    }
  };
}
