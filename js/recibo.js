console.log("🧾 recibo.js — CORE FINAL");

/* =========================================================
   HELPERS
========================================================= */
const $id = (id) => document.getElementById(id);

/* =========================================================
   CONTEXTO DE RECIBO
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
  const steps = document.querySelectorAll(
    "#pedido-progreso-recibo .step"
  );
  const lines = document.querySelectorAll(
    "#pedido-progreso-recibo .line"
  );

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
    if (i < activos) s.classList.add("active");
  });

  lines.forEach((l, i) => {
    if (i < activos - 1) l.classList.add("active");
  });

  estadoTexto.textContent = labels[status] || "Pendiente";
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

  /* HEADER */
  $id("numeroPedido").textContent = pedido.order_number;
  $id("fechaPedido").textContent = new Date(pedido.created_at)
    .toLocaleString("es-HN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: true
    });

  /* PRODUCTOS */
  lista.innerHTML = "";
  pedido.order_items.forEach(item => {
    lista.innerHTML += `
      <div class="cafe-item">
        <span class="cafe-nombre">
          ${item.name} (${item.qty} bolsas)
        </span>
        <span class="cafe-precio">
          L ${(item.qty * item.price).toFixed(2)}
        </span>
      </div>
    `;
  });

  $id("totalPedido").textContent = pedido.total.toFixed(2);

  /* MÉTODO DE PAGO */
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

  /* PROGRESO */
  aplicarProgresoPedido(pedido.status);
}

/* =========================================================
   FECHA (CHECKOUT)
========================================================= */
const fechaEl = $id("fechaPedido");
if (fechaEl && !IS_READ_ONLY) {
  fechaEl.textContent = new Date().toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "medium",
    hour12: true
  });
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
    $id("nombreCliente").textContent   = userRow.name || "";
    $id("correoCliente").textContent   = userRow.email || "";
    $id("telefonoCliente").textContent = userRow.phone || "";
  }

  const { data: addr } = await sb
    .from("addresses")
    .select("state,street,postal_code")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    $id("zonaCliente").textContent      = addr[0].state || "";
    $id("direccionCliente").textContent = addr[0].street || "";
    $id("notaCliente").textContent      = addr[0].postal_code || "";
  }
}

/* =========================================================
   CARRITO (CHECKOUT)
========================================================= */
const carrito = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
const lista = $id("listaProductos");
let total = 0;

if (lista && !IS_READ_ONLY) {
  lista.innerHTML = "";

  carrito.forEach(item => {
    const price = parseFloat(
      item.price.toString().replace(/[^\d.-]/g, "")
    ) || 0;

    const subtotal = price * item.qty;
    total += subtotal;

    lista.innerHTML += `
      <div class="cafe-item">
        <span class="cafe-nombre">
          ${item.name} (${item.qty} bolsas)
        </span>
        <span class="cafe-precio">
          L ${subtotal.toFixed(2)}
        </span>
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

metodoPago?.addEventListener("change", () => {
  resetMetodoPago();

  if (metodoPago.value === "bank_transfer") {
    bloqueDeposito.classList.remove("hidden");
  }

  if (metodoPago.value === "cash") {
    bloqueEfectivo.classList.remove("hidden");
    btnEnviar.disabled = false;
  }
});

$id("btnSubirComprobante")?.addEventListener("click", () => {
  inputFile?.click();
});

inputFile?.addEventListener("change", () => {
  const file = inputFile.files[0];
  if (!file || !file.type.startsWith("image/")) return;

  comprobante = file;
  imgPreview.src = URL.createObjectURL(file);
  previewBox.classList.remove("hidden");
  btnEnviar.disabled = false;
});

/* =========================================================
   ENVIAR PEDIDO (SOLO CHECKOUT)
========================================================= */
btnEnviar?.addEventListener("click", async () => {
  if (IS_READ_ONLY) return;

  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  try {
    const { data: last } = await sb
      .from("orders")
      .select("order_number")
      .eq("user_id", user.id)
      .order("order_number", { ascending: false })
      .limit(1);

    const orderNumber = last?.length ? last[0].order_number + 1 : 1;

    const isCash = metodoPago.value === "cash";
    const isBank = metodoPago.value === "bank_transfer";

    if (isBank && !comprobante) throw new Error("No comprobante");

    const status = isCash ? "cash_on_delivery" : "payment_review";

    const { data: order, error } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        total,
        payment_method: metodoPago.value,
        status,
        order_number: orderNumber
      })
      .select()
      .single();

    if (error) throw error;

    if (isBank) {
      const ext = comprobante.name.split(".").pop();
      const path = `order_${order.id}/${Date.now()}.${ext}`;

      await sb.storage
        .from("payment-receipts")
        .upload(path, comprobante);

      const { data: urlData } =
        sb.storage.from("payment-receipts").getPublicUrl(path);

      await sb.from("payment_receipts").insert({
        order_id: order.id,
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_path: path
      });
    }

    localStorage.removeItem("cafecortero_cart");

    showSnack("Pedido enviado correctamente");

    setTimeout(() => {
      window.location.href = "mis-pedidos.html";
    }, 1500);

  } catch (err) {
    console.error(err);
    showSnack("No se pudo enviar el pedido");
    btnEnviar.disabled = false;
    loader.classList.add("hidden");
  }
});

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
