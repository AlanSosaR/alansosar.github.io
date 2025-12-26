console.log("🧾 recibo.js — CORE FINAL");

/* =========================================================
   HELPERS
========================================================= */
const $id = (id) => document.getElementById(id);

/* =========================================================
   CONTEXTO (¿VIENE DE MIS PEDIDOS?)
========================================================= */
function getOrderIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

const ORDER_ID = getOrderIdFromURL();
const IS_READ_ONLY = Boolean(ORDER_ID);

/* =========================================================
   SNACKBAR
========================================================= */
function showSnack(message) {
  const bar = $id("snackbar");
  if (!bar) return;
  bar.innerHTML = `<span>${message}</span>`;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 3200);
}

/* =========================================================
   ESPERAR SUPABASE
========================================================= */
function esperarSupabase() {
  return new Promise(resolve => {
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
   UI — MODO RECIBO
========================================================= */
function aplicarModoRecibo() {
  const progreso = $id("pedido-progreso-recibo");
  const selectPago = document.querySelector(".pago-select-label");
  const botones = document.querySelector(".recibo-botones");

  if (IS_READ_ONLY) {
    progreso?.classList.remove("hidden");
    selectPago?.classList.add("hidden");
    botones?.classList.add("hidden");
    if (metodoPago) metodoPago.disabled = true;
  } else {
    progreso?.classList.add("hidden");
  }
}

/* =========================================================
   PROGRESO DEL PEDIDO
========================================================= */
function aplicarProgresoPedido(status) {
  const steps = document.querySelectorAll("#pedido-progreso-recibo .step");
  const lines = document.querySelectorAll("#pedido-progreso-recibo .line");
  const estadoTexto = $id("estadoPedidoTexto");

  const mapSteps = {
    payment_review: 2,
    payment_confirmed: 3,
    cash_on_delivery: 3,
    processing: 3,
    shipped: 4,
    delivered: 4
  };

  const labels = {
    payment_review: "Pago en revisión",
    payment_confirmed: "Pago confirmado",
    cash_on_delivery: "Pago contra entrega",
    processing: "En ejecución",
    shipped: "Enviado",
    delivered: "Entregado"
  };

  const activos = mapSteps[status] || 1;

  steps.forEach((s, i) => {
    s.classList.toggle("active", i < activos);
  });

  lines.forEach((l, i) => {
    l.classList.toggle("active", i < activos - 1);
  });

  if (estadoTexto) {
    estadoTexto.textContent = labels[status] || "Pendiente";
  }
}

/* =========================================================
   CARGAR PEDIDO EXISTENTE (MIS PEDIDOS)
========================================================= */
async function cargarPedidoExistente(orderId) {
  const sb = window.supabaseClient;

  const { data: pedido, error } = await sb
    .from("orders")
    .select(`
      id,
      order_number,
      created_at,
      total,
      payment_method,
      status,
      order_items ( name, qty, price ),
      payment_receipts ( file_url )
    `)
    .eq("id", orderId)
    .single();

  if (error || !pedido) {
    console.error("❌ Pedido no encontrado", error);
    showSnack("Pedido no encontrado");
    return;
  }

  /* ===== HEADER ===== */
  const numEl = $id("numeroPedido");
  if (numEl) numEl.textContent = pedido.order_number ?? "—";

  const fechaEl = $id("fechaPedido");
  if (fechaEl) {
    fechaEl.textContent = new Date(pedido.created_at).toLocaleString("es-HN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: true
    });
  }

  /* ===== PRODUCTOS ===== */
  lista.innerHTML = "";
  pedido.order_items.forEach(item => {
    lista.innerHTML += `
      <div class="cafe-item">
        <span class="cafe-nombre">${item.name} (${item.qty} bolsas)</span>
        <span class="cafe-precio">L ${(item.qty * item.price).toFixed(2)}</span>
      </div>
    `;
  });

  $id("totalPedido").textContent = pedido.total.toFixed(2);

  /* ===== MÉTODO DE PAGO ===== */
  metodoPago.value = pedido.payment_method;

  if (pedido.payment_method === "cash") {
    bloqueEfectivo.classList.remove("hidden");
  }

  if (pedido.payment_method === "bank_transfer") {
    bloqueDeposito.classList.remove("hidden");
    if (pedido.payment_receipts?.length) {
      imgPreview.src = pedido.payment_receipts[0].file_url;
      previewBox.classList.remove("hidden");
    }
  }

  /* ===== PROGRESO ===== */
  aplicarProgresoPedido(pedido.status);
}

/* =========================================================
   DATOS CLIENTE (CHECKOUT)
========================================================= */
async function cargarDatosCliente() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  const { data: userRow } = await sb
    .from("users")
    .select("name,email,phone")
    .eq("id", user.id)
    .single();

  if (userRow) {
    $id("nombreCliente").textContent = userRow.name || "";
    $id("correoCliente").textContent = userRow.email || "";
    $id("telefonoCliente").textContent = userRow.phone || "";
  }

  const { data: addr } = await sb
    .from("addresses")
    .select("state,street,postal_code")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    $id("zonaCliente").textContent = addr[0].state || "";
    $id("direccionCliente").textContent = addr[0].street || "";
    $id("notaCliente").textContent = addr[0].postal_code || "";
  }
}

/* =========================================================
   CARRITO (CHECKOUT)
========================================================= */
const lista = $id("listaProductos");
const carrito = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
let total = 0;

if (lista && !IS_READ_ONLY) {
  lista.innerHTML = "";
  carrito.forEach(item => {
    const price = parseFloat(item.price) || 0;
    const subtotal = price * item.qty;
    total += subtotal;

    lista.innerHTML += `
      <div class="cafe-item">
        <span class="cafe-nombre">${item.name} (${item.qty} bolsas)</span>
        <span class="cafe-precio">L ${subtotal.toFixed(2)}</span>
      </div>
    `;
  });

  $id("totalPedido").textContent = total.toFixed(2);
}

/* =========================================================
   MÉTODO DE PAGO
========================================================= */
const metodoPago = $id("metodoPago");
const bloqueDeposito = $id("pago-deposito");
const bloqueEfectivo = $id("pago-efectivo");
const btnEnviar = $id("btnEnviar");
const loader = $id("loaderEnviar");
const inputFile = $id("inputComprobante");
const previewBox = $id("previewComprobante");
const imgPreview = $id("imgComprobante");

let comprobante = null;

function resetMetodoPago() {
  bloqueDeposito?.classList.add("hidden");
  bloqueEfectivo?.classList.add("hidden");
  previewBox?.classList.add("hidden");
  comprobante = null;
  if (btnEnviar) btnEnviar.disabled = true;
}

/* =========================================================
   INIT
========================================================= */
(async function init() {
  await esperarSupabase();

  const user = getUserCache();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  aplicarModoRecibo();

  if (IS_READ_ONLY) {
    await cargarPedidoExistente(ORDER_ID);
  } else {
    await cargarDatosCliente();
    resetMetodoPago();
  }
})();
