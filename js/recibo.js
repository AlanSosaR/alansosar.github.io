console.log("🧾 recibo.js — CORE FINAL DEFINITIVO");

/* =========================================================
   CONSTANTES GLOBALES
========================================================= */
const CART_KEY = "cafecortero_cart";
const RECEIPT_BUCKET = "payment_receipts";

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
    pending_payment: 0,
    payment_review: 1,
    payment_confirmed: 2,
    cash_on_delivery: 2,
    processing: 2,
    shipped: 3,
    delivered: 3
  };

  const labels = {
    pending_payment: "Pendiente de pago",
    payment_review: "Pago en revisión",
    payment_confirmed: "Pago confirmado",
    cash_on_delivery: "Pago contra entrega",
    processing: "En ejecución",
    shipped: "Enviado",
    delivered: "Entregado"
  };

  const activos = mapSteps[status] ?? 0;

  steps.forEach((s, i) => s.classList.toggle("active", i <= activos));
  lines.forEach((l, i) => l.classList.toggle("active", i < activos));

  if (estadoTexto) estadoTexto.textContent = labels[status] || "Pendiente de pago";
}

/* =========================================================
   NÚMERO PROVISIONAL
========================================================= */
async function setNumeroPedidoProvisional() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  const { data } = await sb
    .from("orders")
    .select("order_number")
    .eq("user_id", user.id)
    .order("order_number", { ascending: false })
    .limit(1);

  const last = data?.length ? Number(data[0].order_number) : 0;
  const siguiente = last + 1;

  $id("numeroPedido").textContent = String(siguiente);
  $id("fechaPedido").textContent = new Date().toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: true
  });
}

/* =========================================================
   DATOS CLIENTE + DIRECCIÓN
========================================================= */
let selectedAddressId = null;

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
    .select("id,state,city,street,postal_code")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    selectedAddressId = addr[0].id;
    $id("zonaCliente").textContent =
      [addr[0].state, addr[0].city].filter(Boolean).join(", ");
    $id("direccionCliente").textContent = addr[0].street || "";
    $id("notaCliente").textContent = addr[0].postal_code || "";
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
      user_id,
      address_id,
      order_number,
      created_at,
      total,
      payment_method,
      status,

      users:users!orders_user_id_fkey (
        name,email,phone
      ),

      addresses:addresses!orders_address_id_fkey (
        state,city,street,postal_code
      ),

      order_items (
        quantity,price,
        products ( name )
      ),

      payment_receipts ( file_url )
    `)
    .eq("id", orderId)
    .single();

  if (error || !pedido) {
    showSnack("Pedido no encontrado");
    return;
  }

  $id("numeroPedido").textContent = pedido.order_number;
  $id("fechaPedido").textContent = new Date(pedido.created_at).toLocaleString("es-HN");

  if (pedido.users) {
    $id("nombreCliente").textContent = pedido.users.name || "";
    $id("correoCliente").textContent = pedido.users.email || "";
    $id("telefonoCliente").textContent = pedido.users.phone || "";
  }

  if (pedido.addresses) {
    $id("zonaCliente").textContent =
      [pedido.addresses.state, pedido.addresses.city].filter(Boolean).join(", ");
    $id("direccionCliente").textContent = pedido.addresses.street || "";
    $id("notaCliente").textContent = pedido.addresses.postal_code || "";
  }

  if (lista) {
    lista.innerHTML = "";
    pedido.order_items.forEach(it => {
      lista.innerHTML += `
        <div class="cafe-item">
          <span class="cafe-nombre">${it.products.name} (${it.quantity})</span>
          <span class="cafe-precio">L ${(it.quantity * it.price).toFixed(2)}</span>
        </div>
      `;
    });
  }

  $id("totalPedido").textContent = Number(pedido.total).toFixed(2);
  aplicarProgresoPedido(pedido.status);
}

/* =========================================================
   CARRITO (CHECKOUT)
========================================================= */
const lista = $id("listaProductos");
const carrito = JSON.parse(localStorage.getItem(CART_KEY)) || [];
let total = 0;

if (lista && !IS_READ_ONLY) {
  lista.innerHTML = "";
  carrito.forEach(it => {
    const sub = it.qty * it.price;
    total += sub;
    lista.innerHTML += `
      <div class="cafe-item">
        <span class="cafe-nombre">${it.name} (${it.qty})</span>
        <span class="cafe-precio">L ${sub.toFixed(2)}</span>
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

function resetMetodoPago() {
  bloqueDeposito?.classList.add("hidden");
  bloqueEfectivo?.classList.add("hidden");
  previewBox?.classList.add("hidden");
  if (btnEnviar) btnEnviar.disabled = true;
}

/* =========================================================
   ENVIAR PEDIDO
========================================================= */
async function enviarPedido() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  if (!selectedAddressId) {
    showSnack("Falta dirección");
    return;
  }

  if (carrito.some(p => !p.product_id)) {
    showSnack("Producto inválido. Reagrégalo.");
    return;
  }

  btnEnviar.disabled = true;
  loader?.classList.remove("hidden");

  try {
    const { data: orderRow } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        address_id: selectedAddressId,
        total,
        payment_method: metodoPago.value,
        status: metodoPago.value === "bank_transfer"
          ? "payment_review"
          : "cash_on_delivery"
      })
      .select("id")
      .single();

    const items = carrito.map(it => ({
      order_id: orderRow.id,
      product_id: it.product_id,
      quantity: it.qty,
      price: it.price
    }));

    await sb.from("order_items").insert(items);
    localStorage.setItem(CART_KEY, JSON.stringify([]));
    location.href = `recibo.html?id=${orderRow.id}`;

  } catch (e) {
    console.error(e);
    showSnack("Error al enviar pedido");
    btnEnviar.disabled = false;
  } finally {
    loader?.classList.add("hidden");
  }
}

btnEnviar?.addEventListener("click", e => {
  e.preventDefault();
  enviarPedido();
});

/* =========================================================
   INIT
========================================================= */
(async function init() {
  await esperarSupabase();
  const user = getUserCache();
  if (!user) return location.href = "login.html";

  aplicarModoRecibo();

  if (IS_READ_ONLY) {
    await cargarPedidoExistente(ORDER_ID);
  } else {
    await setNumeroPedidoProvisional();
    await cargarDatosCliente();
    resetMetodoPago();
  }
})();
