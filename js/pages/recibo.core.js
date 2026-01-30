console.log("🧾 recibo.core.js — FINAL DEFINITIVO");

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
   CONTEXTO
========================================================= */
function getOrderIdFromURL() {
  return new URLSearchParams(window.location.search).get("id");
}

const ORDER_ID = getOrderIdFromURL();
const IS_READ_ONLY = Boolean(ORDER_ID);

/* =========================================================
   SNACKBAR (RESPETA MODO RECIBO)
========================================================= */
function showSnack(
  msg,
  onAccept = null,
  actionText = null,
  onAction = null,
  duration = 6000
) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <span class="snack-text">${msg}</span>
    <div class="snack-actions">
      ${
        actionText && onAction && !IS_READ_ONLY
          ? `<button class="snack-action secondary">${actionText}</button>`
          : ""
      }
      <button class="snack-action primary">Aceptar</button>
    </div>
  `;

  bar.classList.add("show");

  const timer = setTimeout(() => {
    bar.classList.remove("show");
  }, duration);

  if (actionText && onAction && !IS_READ_ONLY) {
    bar.querySelector(".snack-action.secondary")
      ?.addEventListener("click", () => {
        clearTimeout(timer);
        bar.classList.remove("show");
        onAction();
      });
  }

  bar.querySelector(".snack-action.primary")
    ?.addEventListener("click", () => {
      clearTimeout(timer);
      bar.classList.remove("show");
      if (onAccept && !IS_READ_ONLY) onAccept();
    });
}

/* =========================================================
   ESPERAR SUPABASE
========================================================= */
function esperarSupabase() {
  return new Promise((resolve) => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve();
      }
    }, 80);
  });
}

/* =========================================================
   USUARIO CACHE
========================================================= */
function getUserCache() {
  try {
    if (localStorage.getItem("cortero_logged") !== "1") return null;
    return JSON.parse(localStorage.getItem("cortero_user"));
  } catch {
    return null;
  }
}

/* =========================================================
   UI — MODO RECIBO (SOLO LECTURA)
========================================================= */
function aplicarModoRecibo() {
  const progreso = $id("pedido-progreso-recibo");
  const pagos = document.querySelector(".pagos");
  const selectPago = document.querySelector(".pago-select-label");
  const botones = document.querySelector(".recibo-botones");

  if (IS_READ_ONLY) {
    progreso?.classList.remove("hidden");
    pagos?.classList.add("hidden");
    selectPago?.classList.add("hidden");
    botones?.classList.add("hidden");
  } else {
    progreso?.classList.add("hidden");
  }
}

/* =========================================================
   PROGRESO DEL PEDIDO (VISUAL)
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

  estadoEl.classList.remove(...clases);
  estadoEl.classList.add(clases[etapa]);
  estadoTexto.textContent = labelMap[status] || "Pendiente";

  const iconMap = {
    pending: "payments",
    payment_review: "fact_check",
    processing: "autorenew",
    shipped: "local_shipping",
    delivered: "done_all"
  };

  iconEl.textContent = iconMap[status] || "payments";
  container.classList.remove("hidden");
}

/* =========================================================
   CARGAR PEDIDO EXISTENTE — COMPLETO
========================================================= */
async function cargarPedidoExistente(orderId) {
  const sb = window.supabaseClient;

  const { data: pedido, error } = await sb
    .from("orders")
    .select(`
      order_number,
      created_at,
      total,
      status,
      payment_method,
      users(name,email,phone),
      addresses(state,city,street,postal_code),
      order_items(quantity,price,products(name)),
      payment_receipts(file_url,created_at,review_status)
    `)
    .eq("id", orderId)
    .single();

  if (error || !pedido) {
    console.error(error);
    showSnack("Pedido no encontrado");
    return;
  }

  /* ===============================
     CABECERA
  =============================== */
  $id("numeroPedido").textContent = `Pedido N.º ${pedido.order_number}`;

  const fecha = new Date(pedido.created_at);
  $id("fechaPedido").textContent = fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  $id("horaPedido").textContent = fecha.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  /* ===============================
     CLIENTE
  =============================== */
  if (pedido.users) {
    $id("nombreCliente").textContent = pedido.users.name || "—";
    $id("correoCliente").textContent = pedido.users.email || "—";
    $id("telefonoCliente").textContent = pedido.users.phone || "—";
  }

  if (pedido.addresses) {
    $id("zonaCliente").textContent =
      `${pedido.addresses.state}, ${pedido.addresses.city}`;
    $id("direccionCliente").textContent =
      pedido.addresses.street || "—";
    $id("notaCliente").textContent =
      pedido.addresses.postal_code || "—";
  }

  /* ===============================
     PRODUCTOS
  =============================== */
  const lista = $id("listaProductos");
  if (lista) {
    lista.innerHTML = "";
    pedido.order_items.forEach(it => {
      lista.innerHTML += `
        <div class="cafe-item">
          <span>${it.products.name} (${it.quantity})</span>
          <span>L ${(it.quantity * it.price).toFixed(2)}</span>
        </div>
      `;
    });
  }

  /* ===============================
     TOTAL
  =============================== */
  $id("totalPedido").textContent = pedido.total.toFixed(2);

  /* ===============================
     ESTADO VISUAL REAL
  =============================== */
  let statusVisual = pedido.status;

  if (
    pedido.payment_method === "bank_transfer" &&
    pedido.payment_receipts?.some(r => r.review_status === "pending")
  ) {
    statusVisual = "payment_review";
  }

  aplicarProgresoPedido(statusVisual, pedido.payment_method);
}

/* =========================================================
   EXPONER CORE
========================================================= */
window.esperarSupabase = esperarSupabase;
window.getUserCache = getUserCache;
window.showSnack = showSnack;
window.aplicarModoRecibo = aplicarModoRecibo;
window.aplicarProgresoPedido = aplicarProgresoPedido;
window.cargarPedidoExistente = cargarPedidoExistente;
