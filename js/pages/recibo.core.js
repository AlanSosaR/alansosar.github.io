/**
 * 🧾 recibo.core.js — NÚCLEO MATERIAL 3 EXPRESSIVE
 * ---------------------------------------------------------
 * Este archivo establece las funciones maestras para Checkout y View.
 */
console.log("🧾 recibo.core.js — Sincronizado");

/* =========================================================
   PROPIEDADES GLOBALES (Disponibles para todos los scripts)
========================================================= */
window.$id = (id) => document.getElementById(id);
window.ORDER_ID = new URLSearchParams(window.location.search).get("id");
window.IS_READ_ONLY = Boolean(window.ORDER_ID);

// Helper para obtener usuario (Evita ReferenceError en View)
window.getUserCache = () => {
    const session = localStorage.getItem("sb-pkhnpsvcyndjebqzkfbe-auth-token");
    try {
        return session ? JSON.parse(session).user : null;
    } catch (e) {
        return null;
    }
};

// Promesa de carga para Supabase
window.esperarSupabase = () => new Promise(r => {
    if (window.supabaseClient) return r();
    const i = setInterval(() => { 
        if (window.supabaseClient) { clearInterval(i); r(); } 
    }, 100);
});

/* =========================================================
   UI: MODO LECTURA
========================================================= */
window.aplicarModoRecibo = () => {
    console.log("👁️ Aplicando interfaz de solo lectura");
    const btnEnviarContainer = document.querySelector(".recibo-botones");
    const selectorPago = document.querySelector(".pago-select-label");
    
    // Ocultar elementos de edición/envío
    if (btnEnviarContainer) btnEnviarContainer.classList.add("hidden");
    if (selectorPago) selectorPago.classList.add("hidden");
    
    // El botón volver siempre debe estar activo en View
    configurarBotonVolver();
};

/* =========================================================
   PÍLDORA DE ESTADO DINÁMICA
========================================================= */
window.inyectarPildoraEstado = (status, paymentMethod) => {
    const container = window.$id("estado-pildora-container");
    if (!container) return;

    const config = {
        pending: { label: paymentMethod === "bank_transfer" ? "Esperando Pago" : "Pendiente", icon: "schedule", class: "status-pending" },
        payment_review: { label: "Validando Pago", icon: "fact_check", class: "status-review" },
        processing: { label: "Preparando", icon: "coffee", class: "status-processing" },
        shipped: { label: "En camino", icon: "local_shipping", class: "status-shipped" },
        delivered: { label: "Entregado", icon: "verified", class: "status-delivered" },
        cancelled: { label: "Cancelado", icon: "block", class: "status-cancelled" }
    };

    const state = config[status] || config.pending;

    container.innerHTML = `
        <div class="status-pill ${state.class}">
            <span class="material-symbols-outlined">${state.icon}</span>
            <span class="pill-text">${state.label}</span>
        </div>
    `;

    // Gestionar visibilidad del botón cancelar (Solo en pendiente)
    const containerCancelar = window.$id("container-cancelar");
    if (containerCancelar) {
        (status === "pending") ? containerCancelar.classList.remove("hidden") : containerCancelar.classList.add("hidden");
    }
};

/* =========================================================
   CARGAR DATOS DESDE SUPABASE
========================================================= */
window.cargarPedidoExistente = async (orderId) => {
    const sb = window.supabaseClient;
    if (!sb) return;

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

    if (error || !pedido) return console.error("Pedido no encontrado");

    // Llenar UI Básica
    window.$id("numeroPedido").textContent = pedido.order_number;
    const fecha = new Date(pedido.created_at);
    window.$id("fechaPedido").textContent = fecha.toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' });
    window.$id("horaPedido").textContent = fecha.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit', hour12: true });

    // Estado con lógica de transferencia
    let statusVisual = pedido.status;
    if (pedido.payment_method === "bank_transfer" && pedido.payment_receipts?.some(r => r.review_status === "pending")) {
        statusVisual = "payment_review";
    }
    window.inyectarPildoraEstado(statusVisual, pedido.payment_method);

    // Dirección y Cliente
    window.$id("direccion-resumen").textContent = pedido.addresses ? `${pedido.addresses.street}, ${pedido.addresses.city}` : "Retiro en tienda";
    window.$id("notaCliente").textContent = pedido.order_notes || "Sin notas";
    window.$id("nombreCliente").textContent = pedido.users?.name || "—";
    window.$id("telefonoCliente").textContent = pedido.users?.phone || "—";

    // Lista de productos M3
    const lista = window.$id("listaProductos");
    lista.innerHTML = pedido.order_items.map(it => `
        <div class="cafe-item">
            <span class="item-name">${it.products.name} (x${it.quantity})</span>
            <span class="item-price">L ${(it.quantity * it.price).toFixed(2)}</span>
        </div>
    `).join('');

    window.$id("totalPedido").textContent = pedido.total.toFixed(2);
    
    // UI de Comprobante
    gestionarUIPagosVer(pedido);
};

function gestionarUIPagosVer(pedido) {
    const pagoDeposito = window.$id("pago-deposito");
    const pagoEfectivo = window.$id("pago-efectivo");
    
    if (pedido.payment_method === "bank_transfer") {
        pagoDeposito?.classList.remove("hidden");
        pagoEfectivo?.classList.add("hidden");
        if (pedido.payment_receipts?.length > 0) {
            window.$id("previewComprobante")?.classList.remove("hidden");
            window.$id("imgComprobante").src = pedido.payment_receipts[0].file_url;
            window.$id("btnSubirComprobante")?.classList.add("hidden");
        }
    } else {
        pagoEfectivo?.classList.remove("hidden");
        pagoDeposito?.classList.add("hidden");
    }
}

function configurarBotonVolver() {
    const btnBack = window.$id("btn-back");
    if (!btnBack) return;
    btnBack.onclick = () => (window.history.length > 1) ? window.history.back() : (window.location.href = "mis-pedidos.html");
}

// Inicialización de elementos comunes
document.addEventListener("DOMContentLoaded", configurarBotonVolver);
