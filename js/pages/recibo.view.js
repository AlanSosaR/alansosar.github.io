/**
 * 🧾 recibo.view.js — FINAL MATERIAL 3 EXPRESSIVE
 * ---------------------------------------------------------
 * Vista de recibo (modo SOLO LECTURA).
 */

console.log("🧾 recibo.view.js — Iniciando vinculación con Core");

document.addEventListener("DOMContentLoaded", async () => {
  
  // 1. Obtener ID de la URL inmediatamente
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  if (!orderId) {
    console.warn("⚠️ No se encontró ID de pedido.");
    return; 
  }

  try {
    // ⏳ 2. SINCRONIZACIÓN CON EL CORE: Esperar a que las funciones existan
    if (typeof window.esperarSupabase !== "function") {
      await new Promise(r => {
        const check = setInterval(() => {
          if (typeof window.esperarSupabase === "function") {
            clearInterval(check);
            r();
          }
        }, 50);
      });
    }
    
    // Esperar a que la instancia de Supabase esté lista
    await window.esperarSupabase();

    // 🔐 3. VALIDACIÓN DE SESIÓN CON REINTENTOS (Crucial para evitar rebotes)
    let user = null;
    let intentos = 0;
    
    // Le damos hasta 1 segundo (10 intentos de 100ms) para que Supabase recupere el usuario
    while (!user && intentos < 10) {
      if (typeof window.getUserCache === "function") {
        user = window.getUserCache();
      }
      if (user) break;
      await new Promise(r => setTimeout(r, 100));
      intentos++;
    }

    // Si tras el tiempo de gracia no hay usuario, redirigimos
    if (!user) {
      console.warn("🔐 Sesión no detectada tras reintentos, redirigiendo...");
      if (!window.location.pathname.includes("login.html")) {
        window.location.href = "login.html";
      }
      return;
    }

    // ✅ 4. CONEXIÓN CON UI CORE: Aplicar modo lectura
    if (typeof window.aplicarModoRecibo === "function") {
      window.aplicarModoRecibo();
    } else {
      console.error("❌ Error: aplicarModoRecibo no encontrada en Core");
    }

    // 🧾 5. CARGAR DATOS DESDE EL CORE
    if (typeof window.cargarPedidoExistente === "function") {
      await window.cargarPedidoExistente(orderId);
    } else {
      console.error("❌ Error: cargarPedidoExistente no encontrada en Core");
    }

    // ⚡ 6. ACCIONES: Configurar botón cancelar
    configurarAccionCancelar(orderId);

  } catch (err) {
    console.error("❌ Error en la orquestación de la vista:", err);
    if (window.showSnack) window.showSnack("Error de conexión con el sistema");
  }
});

/* =========================================================
   LÓGICA DE CANCELACIÓN (Utilizando cliente del Core)
========================================================= */
async function configurarAccionCancelar(orderId) {
  const btnCancelar = document.getElementById("btnCancelarPedido");
  if (!btnCancelar) return;

  btnCancelar.onclick = async () => {
    const confirmar = confirm("¿Deseas cancelar este pedido? Esta acción no se puede deshacer.");
    if (!confirmar) return;

    try {
      const sb = window.supabaseClient; // Instancia compartida por el Core
      if (!sb) throw new Error("Supabase no disponible");

      btnCancelar.disabled = true;
      const originalHTML = btnCancelar.innerHTML;
      btnCancelar.innerHTML = `<span class="material-symbols-outlined fa-spin">autorenew</span> Procesando...`;

      const { error } = await sb
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      if (window.showSnack) window.showSnack("Pedido cancelado correctamente");
      
      // Sincronizar actualización con el Core
      if (window.cargarPedidoExistente) {
        await window.cargarPedidoExistente(orderId);
      }
      
      btnCancelar.classList.add("hidden");

    } catch (err) {
      console.error("Error al cancelar:", err);
      if (window.showSnack) window.showSnack("Error: No se pudo cancelar");
      btnCancelar.disabled = false;
      btnCancelar.innerHTML = `<span class="material-symbols-outlined">cancel</span> Cancelar Pedido`;
    }
  };
}
