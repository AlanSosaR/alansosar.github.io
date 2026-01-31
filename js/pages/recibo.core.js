/**
 * 🧾 recibo.view.js — FINAL MATERIAL 3 (CORREGIDO)
 */
console.log("🧾 recibo.view.js — Iniciando");

document.addEventListener("DOMContentLoaded", () => {
    // Si no hay ID en la URL, este script no debe actuar
    const orderId = new URLSearchParams(window.location.search).get("id");
    if (!orderId) return;

    (async function initView() {
        try {
            // ⏳ Paso 1: Esperar a que Supabase y el Core estén presentes
            await window.esperarSupabase();

            // ⏳ Paso 2: Pequeña espera de cortesía para que el Core registre sus funciones
            if (typeof window.getUserCache !== "function") {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 🔐 Paso 3: Validación de usuario segura
            const user = (typeof window.getUserCache === "function") 
                ? window.getUserCache() 
                : null;

            if (!user) {
                console.warn("🔐 No se detectó sesión activa. Redirigiendo...");
                // Solo redirigir si realmente confirmamos que no hay usuario tras esperar
                setTimeout(() => { location.href = "login.html"; }, 300);
                return;
            }

            // 👁️ Paso 4: Aplicar interfaz de recibo
            if (typeof window.aplicarModoRecibo === "function") {
                window.aplicarModoRecibo();
            }

            // 🧾 Paso 5: Cargar datos del pedido
            if (typeof window.cargarPedidoExistente === "function") {
                await window.cargarPedidoExistente(orderId);
            }

            configurarAccionCancelar(orderId);

        } catch (err) {
            console.error("❌ Error crítico en vista:", err);
        }
    })();
});

function configurarAccionCancelar(id) {
    const btn = document.getElementById("btnCancelarPedido");
    if (!btn) return;

    btn.onclick = async () => {
        if (!confirm("¿Deseas cancelar este pedido?")) return;
        
        try {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Cancelando...`;
            
            const { error } = await window.supabaseClient
                .from("orders")
                .update({ status: "cancelled" })
                .eq("id", id);

            if (error) throw error;

            if (typeof window.cargarPedidoExistente === "function") {
                await window.cargarPedidoExistente(id);
            }
            alert("Pedido cancelado correctamente.");

        } catch (err) {
            console.error(err);
            btn.disabled = false;
            btn.innerHTML = `<span class="material-symbols-outlined">cancel</span> Cancelar Pedido`;
        }
    };
}
