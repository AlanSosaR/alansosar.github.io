/**
 * 🧾 recibo.core.js — VERSIÓN MATERIAL 3 EXPRESSIVE
 * ---------------------------------------------------------
 */
console.log("🧾 recibo.core.js — Cargado con Píldoras y Navegación Inteligente");

/* =========================================================
   HELPERS Y CONSTANTES
========================================================= */
const $id = (id) => document.getElementById(id);
const ORDER_ID = new URLSearchParams(window.location.search).get("id");
const IS_READ_ONLY = Boolean(ORDER_ID);

/* =========================================================
   NAVEGACIÓN INTELIGENTE (BOTÓN VOLVER)
========================================================= */
function configurarBotonVolver() {
    const btnBack = $id("btn-back");
    if (!btnBack) return;

    btnBack.onclick = () => {
        // Si hay historial en la pestaña, retrocede (ej. viene de datos-cliente)
        if (window.history.length > 1 && document.referrer !== "") {
            window.history.back();
        } else {
            // Si entró directo por enlace o notificación, va a mis pedidos
            window.location.href = "mis-pedidos.html";
        }
    };
}

/* =========================================================
   PÍLDORA DE ESTADO DINÁMICA
========================================================= */
function inyectarPildoraEstado(status, paymentMethod) {
    const container = $id("estado-pildora-container");
    if (!container) return;

    // Mapeo de estilos y textos
    const config = {
        pending: { 
            label: paymentMethod === "bank_transfer" ? "Pendiente de pago" : "Pago al recibir", 
            icon: "payments", 
            class: "status-pending" 
        },
        payment_review: { 
            label: "Pago en revisión", 
            icon: "fact_check", 
            class: "status-review" 
        },
        processing: { 
            label: "En preparación", 
            icon: "inventory_2", 
            class: "status-processing" 
        },
        shipped: { 
            label: "En camino", 
            icon: "local_shipping", 
            class: "status-shipped" 
        },
        delivered: { 
            label: "Entregado", 
            icon: "check_circle", 
            class: "status-delivered" 
        },
        cancelled: { 
            label: "Cancelado", 
            icon: "cancel", 
            class: "status-cancelled" 
        }
    };

    const state = config[status] || config.pending;

    container.innerHTML = `
        <div class="status-pill ${state.class}">
            <span class="material-symbols-outlined">${state.icon}</span>
            <span>${state.label}</span>
        </div>
    `;

    // Lógica del botón Cancelar: Solo visible en 'pending'
    const btnCancelar = $id("container-cancelar");
    if (btnCancelar) {
        if (status === "pending") {
            btnCancelar.classList.remove("hidden");
        } else {
            btnCancelar.classList.add("hidden");
        }
    }
}

/* =========================================================
   CARGAR PEDIDO EXISTENTE
========================================================= */
async function cargarPedidoExistente(orderId) {
    const sb = window.supabaseClient;

    const { data: pedido, error } = await sb
        .from("orders")
        .select(`
            order_number, created_at, total, status, payment_method, order_notes,
            users(name, email, phone),
            addresses(state, city, street),
            order_items(quantity, price, products(name)),
            payment_receipts(file_url, review_status)
        `)
        .eq("id", orderId)
        .single();

    if (error || !pedido) {
        console.error("Error cargando pedido:", error);
        return;
    }

    // 1. Cabecera (Fecha estilo Mis Pedidos)
    $id("numeroPedido").textContent = pedido.order_number;
    const fecha = new Date(pedido.created_at);
    $id("fechaPedido").textContent = fecha.toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' });
    $id("horaPedido").textContent = fecha.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit', hour12: true });

    // 2. Estado Visual (Píldora)
    let statusVisual = pedido.status;
    // Si es transferencia y hay recibo pendiente de revisar, forzamos estado visual
    if (pedido.payment_method === "bank_transfer" && pedido.payment_receipts?.some(r => r.review_status === "pending")) {
        statusVisual = "payment_review";
    }
    inyectarPildoraEstado(statusVisual, pedido.payment_method);

    // 3. Cliente y Entrega
    if (pedido.addresses) {
        $id("direccion-resumen").textContent = `${pedido.addresses.street}, ${pedido.addresses.city}`;
    }
    $id("notaCliente").textContent = pedido.order_notes || "Sin referencia adicional";
    $id("nombreCliente").textContent = pedido.users?.name || "—";
    $id("correoCliente").textContent = pedido.users?.email || "—";
    $id("telefonoCliente").textContent = pedido.users?.phone || "—";

    // 4. Productos
    const lista = $id("listaProductos");
    lista.innerHTML = "";
    pedido.order_items.forEach(it => {
        lista.innerHTML += `
            <div class="cafe-item">
                <span class="item-name">${it.products.name} × ${it.quantity}</span>
                <span class="item-price">L ${(it.quantity * it.price).toFixed(2)}</span>
            </div>`;
    });

    // 5. Total
    $id("totalPedido").textContent = pedido.total.toFixed(2);

    // 6. Método de Pago UI
    gestionarUIPagosVer(pedido);
}

/** Gestiona qué bloques de pago mostrar en modo lectura */
function gestionarUIPagosVer(pedido) {
    const pagoDeposito = $id("pago-deposito");
    const pagoEfectivo = $id("pago-efectivo");
    const selectPago = document.querySelector(".pago-select-label");
    
    if (selectPago) selectPago.classList.add("hidden");

    if (pedido.payment_method === "bank_transfer") {
        pagoDeposito.classList.remove("hidden");
        pagoEfectivo.classList.add("hidden");
        
        // Mostrar comprobante si existe
        const preview = $id("previewComprobante");
        const img = $id("imgComprobante");
        if (pedido.payment_receipts?.length > 0) {
            preview.classList.remove("hidden");
            img.src = pedido.payment_receipts[0].file_url;
            $id("btnSubirComprobante")?.classList.add("hidden");
        }
    } else {
        pagoEfectivo.classList.remove("hidden");
        pagoDeposito.classList.add("hidden");
    }
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    configurarBotonVolver();
});

// Exponer funciones necesarias
window.esperarSupabase = () => new Promise(r => {
    if (window.supabaseClient) return r();
    const i = setInterval(() => { if (window.supabaseClient) { clearInterval(i); r(); } }, 100);
});
window.cargarPedidoExistente = cargarPedidoExistente;
window.inyectarPildoraEstado = inyectarPildoraEstado;
