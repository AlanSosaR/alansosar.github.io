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
   UI — MODO RECIBO (SOLO LECTURA) — CORRECTO
========================================================= */
function aplicarModoRecibo() {
  if (!IS_READ_ONLY) return;

  // 🔑 NO ocultar el contenedor de pagos
  document.querySelector(".pagos")?.classList.remove("hidden");

  // ❌ ocultar solo elementos interactivos
  document.querySelector(".pago-select-label")?.classList.add("hidden");
  document.querySelector(".recibo-botones")?.classList.add("hidden");
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
      ? { pending: 0, payment_review: 1, processing: 2, shipped: 3 }
      : { pending: 0, processing: 1, shipped: 2, delivered: 3 };

  const labelMap =
    paymentMethod === "bank_transfer"
      ? {
          pending: "Pendiente de pago",
          payment_review: "Pago en revisión",
          processing: "En preparación",
          shipped: "Enviado"
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
    shipped: "local_shipping"
  };

  iconEl.textContent = iconMap[status] || "payments";
}

/* =========================================================
   CARGAR PEDIDO EXISTENTE — FINAL CORREGIDO
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
  $id("numeroPedido").textContent = pedido.order_number;

  const fecha = new Date(pedido.created_at);
  $id("fechaPedido").textContent = fecha.toLocaleDateString("es-ES");
  $id("horaPedido").textContent = fecha.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit"
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
    $id("direccionCliente").textContent = pedido.addresses.street || "—";
    $id("notaCliente").textContent = pedido.addresses.postal_code || "—";
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
   MÉTODO DE PAGO — SOLO INFORMACIÓN (RECIBO)
=============================== */
const pagoDeposito = $id("pago-deposito");
const pagoEfectivo = $id("pago-efectivo");
const preview = $id("previewComprobante");
const img = $id("imgComprobante");
const btnSubir = $id("btnSubirComprobante");

/* -------------------------------
   RESET DEFENSIVO
-------------------------------- */
pagoDeposito?.classList.add("hidden");
pagoEfectivo?.classList.add("hidden");
preview?.classList.add("hidden");
btnSubir?.classList.add("hidden");

if (img) {
  img.src = "";
  img.alt = "";
}

/* =================================================
   DEPÓSITO BANCARIO (RECIBO)
================================================= */
if (pedido.payment_method === "bank_transfer") {
  pagoDeposito?.classList.remove("hidden");

  // Cambiar texto a modo recibo (NO checkout)
  const info = pagoDeposito.querySelector(".comprobante-info");
  if (info) {
    info.innerHTML = `
      <strong>Enviaste el dinero a la siguiente cuenta bancaria:</strong><br>
      Banco Atlántida — Cuenta <strong>123456789</strong><br>
      A nombre de <strong>Café Cortero</strong>
      <br><br>
      <strong>Este es el comprobante que enviaste:</strong>
    `;
  }

  // Mostrar SOLO la imagen del comprobante real
  if (pedido.payment_receipts?.length && preview && img) {
    const receipt = pedido.payment_receipts
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (receipt?.file_url) {
      preview.classList.remove("hidden");
      img.src = receipt.file_url;
      img.alt = "Comprobante de pago enviado";

      // Eliminar cualquier texto heredado del checkout
      preview.querySelector("p")?.remove();
    }
  }
}

/* =================================================
   PAGO EN EFECTIVO (RECIBO)
================================================= */
if (
  pedido.payment_method === "cash_on_delivery" ||
  pedido.payment_method === "cash"
) {
  pagoEfectivo?.classList.remove("hidden");

  const info = pagoEfectivo.querySelector(".comprobante-info");
  if (info) {
    info.innerHTML = `
      <strong>Elegiste pago en efectivo.</strong><br>
      El pago se realizará al momento de la
      <strong>entrega del pedido</strong>.
    `;
  }

  // Imagen ilustrativa (NO comprobante)
  if (preview && img) {
    preview.classList.remove("hidden");
    img.src = "imagenes/pago_en_mano.svg";
    img.alt = "Pago en efectivo al recibir el pedido";

    preview.querySelector("p")?.remove();
  }
}

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
} // ✅ CIERRE DE cargarPedidoExistente

/* =========================================================
   EXPONER CORE
========================================================= */
window.esperarSupabase = esperarSupabase;
window.getUserCache = getUserCache;
window.showSnack = showSnack;
window.aplicarModoRecibo = aplicarModoRecibo;
window.aplicarProgresoPedido = aplicarProgresoPedido;
window.cargarPedidoExistente = cargarPedidoExistente;
