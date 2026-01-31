/**
 * 🧾 recibo.core.js — FINAL DEFINITIVO CORREGIDO
 * ---------------------------------------------------------
 * Gestión de visualización de pedidos Café Cortero
 */
console.log("🧾 recibo.core.js — Sincronizado con Material 3 Expressive");

/* =========================================================
   CONSTANTES
========================================================= */
const CART_KEY = "cafecortero_cart";
const RECEIPT_BUCKET = "payment-receipts";

/* =========================================================
   HELPERS
========================================================= */
const $id = (id) => document.getElementById(id);

/* =========================================================
   CONTEXTO (Exponiendo a window para visibilidad global)
========================================================= */
window.ORDER_ID = new URLSearchParams(window.location.search).get("id");
window.IS_READ_ONLY = Boolean(window.ORDER_ID);

/* =========================================================
   SNACKBAR
========================================================= */
function showSnack(msg, duration = 5000) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.textContent = msg;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), duration);
}

/* =========================================================
   ESPERAR SUPABASE (Optimizado)
========================================================= */
function esperarSupabase() {
  return new Promise((resolve) => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve();
      }
    }, 50); // Un poco más rápido para mejorar UX
  });
}

/* =========================================================
   USUARIO CACHE (Corregido para ser más flexible)
========================================================= */
function getUserCache() {
  try {
    // Intentar con tu clave personalizada
    const logged = localStorage.getItem("cortero_logged");
    const user = localStorage.getItem("cortero_user");
    
    if (logged === "1" && user) {
        return JSON.parse(user);
    }
    
    // Fallback: Buscar en la sesión nativa de Supabase por si acaso
    const sbKey = Object.keys(localStorage).find(k => k.includes("-auth-token"));
    if (sbKey) {
        return JSON.parse(localStorage.getItem(sbKey))?.user;
    }

    return null;
  } catch (err) {
    console.error("Error en getUserCache:", err);
    return null;
  }
}

/* =========================================================
   UI — MODO RECIBO (Asegurando limpieza Material 3)
========================================================= */
function aplicarModoRecibo() {
  if (!window.IS_READ_ONLY) return;

  // Mostramos sección de pagos y ocultamos lo innecesario
  document.querySelector(".pagos")?.classList.remove("hidden");
  document.querySelector(".pago-select-label")?.classList.add("hidden");
  
  // Ocultar botones de enviar/confirmar que pertenecen al checkout
  const botonesCheckout = document.querySelector(".recibo-botones");
  if (botonesCheckout) {
      botonesCheckout.style.display = "none";
      botonesCheckout.classList.add("hidden");
  }
}

/* =========================================================
   PROGRESO DEL PEDIDO
========================================================= */
function aplicarProgresoPedido(status, paymentMethod) {
  const container = $id("pedido-progreso-recibo");
  if (!container) return;

  const steps = container.querySelectorAll(".step");
  const lines = container.querySelectorAll(".line");
  const estadoTexto = $id("estadoPedidoTexto");
  const estadoEl = container.querySelector(".estado");
  const iconEl = container.querySelector(".estado-icon");

  const clases = ["pago", "revision", "confirmado", "envio"];

  const etapaMap =
    paymentMethod === "bank_transfer"
      ? { pending: 0, payment_review: 1, processing: 2, shipped: 3, delivered: 3 }
      : { pending: 0, processing: 1, shipped: 2, delivered: 3 };

  const labelMap =
    paymentMethod === "bank_transfer"
      ? {
          pending: "Pendiente de pago",
          payment_review: "Pago en revisión",
          processing: "En preparación",
          shipped: "Enviado",
          delivered: "Entregado"
        }
      : {
          pending: "Pago al recibir",
          processing: "En preparación",
          shipped: "Enviado",
          delivered: "Entregado"
        };

  const etapa = etapaMap[status] ?? 0;

  steps.forEach((s, i) => {
    s.classList.remove(...clases);
    if (i <= etapa) s.classList.add(clases[i]);
  });

  lines.forEach((l, i) => {
    l.classList.remove(...clases);
    if (i < etapa) l.classList.add(clases[i]);
  });

  if (estadoEl) {
      estadoEl.classList.remove(...clases);
      estadoEl.classList.add(clases[etapa > 3 ? 3 : etapa]);
  }
  
  if (estadoTexto) estadoTexto.textContent = labelMap[status] || "Pendiente";

  const iconMap = {
    pending: "payments",
    payment_review: "fact_check",
    processing: "autorenew",
    shipped: "local_shipping",
    delivered: "check_circle"
  };

  if (iconEl) iconEl.textContent = iconMap[status] || "payments";
}

/* =========================================================
   CARGAR PEDIDO EXISTENTE
========================================================= */
async function cargarPedidoExistente(orderId) {
  if (!orderId) return;
  const sb = window.supabaseClient;

  const { data: pedido, error } = await sb
    .from("orders")
    .select(`
      order_number, created_at, total, status, payment_method, order_notes,
      users(name,email,phone),
      addresses(state,city,street),
      order_items(quantity,price,products(name)),
      payment_receipts(file_url,created_at,review_status)
    `)
    .eq("id", orderId)
    .single();

  if (error || !pedido) {
    showSnack("Pedido no encontrado");
    return;
  }

  // 1. Cabecera
  if ($id("numeroPedido")) $id("numeroPedido").textContent = pedido.order_number;
  const fecha = new Date(pedido.created_at);
  if ($id("fechaPedido")) $id("fechaPedido").textContent = fecha.toLocaleDateString("es-ES");
  if ($id("horaPedido")) $id("horaPedido").textContent = fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  // 2. Cliente y Notas
  if (pedido.users) {
    if ($id("nombreCliente")) $id("nombreCliente").textContent = pedido.users.name || "—";
    if ($id("correoCliente")) $id("correoCliente").textContent = pedido.users.email || "—";
    if ($id("telefonoCliente")) $id("telefonoCliente").textContent = pedido.users.phone || "—";
  }

  if (pedido.addresses) {
    if ($id("zonaCliente")) $id("zonaCliente").textContent = `${pedido.addresses.state}, ${pedido.addresses.city}`;
    if ($id("direccionCliente")) $id("direccionCliente").textContent = pedido.addresses.street || "—";
  }
  
  // Nota del cliente (importante)
  if ($id("notaCliente")) $id("notaCliente").textContent = pedido.order_notes || "Sin referencia";

  // 3. Productos
  const lista = $id("listaProductos");
  if (lista) {
    lista.innerHTML = pedido.order_items.map(it => `
        <div class="cafe-item">
          <span>${it.products.name} (${it.quantity})</span>
          <span>L ${(it.quantity * it.price).toFixed(2)}</span>
        </div>`).join("");
  }

  // 4. Total
  if ($id("totalPedido")) $id("totalPedido").textContent = pedido.total.toFixed(2);

  // 5. UI Pagos
  gestionarPanelesPago(pedido);

  // 6. Estado Visual
  let statusVisual = pedido.status;
  if (pedido.payment_method === "bank_transfer" && pedido.payment_receipts?.some(r => r.review_status === "pending")) {
    statusVisual = "payment_review";
  }
  aplicarProgresoPedido(statusVisual, pedido.payment_method);
}

/** Helper interno para los paneles de pago */
function gestionarPanelesPago(pedido) {
    const pagoDeposito = $id("pago-deposito");
    const pagoEfectivo = $id("pago-efectivo");
    const preview = $id("previewComprobante");
    const img = $id("imgComprobante");

    [pagoDeposito, pagoEfectivo, preview].forEach(el => el?.classList.add("hidden"));

    if (pedido.payment_method === "bank_transfer") {
        pagoDeposito?.classList.remove("hidden");
        if (pedido.payment_receipts?.length && img) {
            const receipt = pedido.payment_receipts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
            preview?.classList.remove("hidden");
            img.src = receipt.file_url;
        }
    } else {
        pagoEfectivo?.classList.remove("hidden");
        if (img) img.src = "imagenes/pago_en_mano.svg"; // Opcional
        preview?.classList.remove("hidden");
    }
}

/* =========================================================
   EXPONER CORE (Globalmente)
========================================================= */
window.esperarSupabase = esperarSupabase;
window.getUserCache = getUserCache;
window.showSnack = showSnack;
window.aplicarModoRecibo = aplicarModoRecibo;
window.aplicarProgresoPedido = aplicarProgresoPedido;
window.cargarPedidoExistente = cargarPedidoExistente;
