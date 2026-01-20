console.log("🧾 recibo.js — CORE FINAL DEFINITIVO");

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
   ELEMENTOS UI
========================================================= */
const metodoPago = $id("metodoPago");
const bloqueDeposito = $id("pago-deposito");
const bloqueEfectivo = $id("pago-efectivo");
const btnEnviar = $id("btnEnviar");
const loader = $id("loaderEnviar");

const inputFile = $id("inputComprobante");
const previewBox = $id("previewComprobante");
const imgPreview = $id("imgComprobante");
const btnSubirComprobante = $id("btnSubirComprobante");

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
function showSnack(msg) {
  const bar = $id("snackbar");
  if (!bar) return;
  bar.innerHTML = `<span>${msg}</span>`;
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
    metodoPago && (metodoPago.disabled = true);
    btnEnviar && (btnEnviar.disabled = true);
  } else {
    progreso?.classList.add("hidden");
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

  let etapaMap = {};
  let labelMap = {};

  if (paymentMethod === "bank_transfer") {
    etapaMap = {
      pending_payment: 0,
      payment_review: 1,
      payment_confirmed: 2,
      processing: 2,
      shipped: 3,
      delivered: 3
    };
    labelMap = {
      pending_payment: "Pendiente de pago",
      payment_review: "Pago en revisión",
      payment_confirmed: "Pago confirmado",
      processing: "En ejecución",
      shipped: "Enviado",
      delivered: "Entregado"
    };
  } else {
    etapaMap = {
      cash_on_delivery: 0,
      processing: 1,
      shipped: 2,
      delivered: 3
    };
    labelMap = {
      cash_on_delivery: "Pago al recibir",
      processing: "En ejecución",
      shipped: "Enviado",
      delivered: "Entregado"
    };
  }

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
    pending_payment: "payments",
    payment_review: "fact_check",
    payment_confirmed: "verified",
    cash_on_delivery: "payments",
    processing: "autorenew",
    shipped: "local_shipping",
    delivered: "done_all"
  };

  iconEl.textContent = iconMap[status] || "payments";
  container.classList.remove("hidden");
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

  const next = (data?.[0]?.order_number || 0) + 1;

  $id("numeroPedido").textContent = next;

  // 👉 FORMATO SOLO PARA CHECKOUT
  $id("fechaPedido").textContent = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  const horaEl = $id("horaPedido");
  if (horaEl) {
    horaEl.textContent = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }
}

/* =========================================================
   DATOS CLIENTE (CHECKOUT)
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
    $id("nombreCliente").textContent = userRow.name || "—";
    $id("correoCliente").textContent = userRow.email || "—";
    $id("telefonoCliente").textContent = userRow.phone || "—";
  }

  const { data: addr } = await sb
    .from("addresses")
    .select("id,state,city,street,postal_code")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    selectedAddressId = addr[0].id;
    $id("zonaCliente").textContent = `${addr[0].state}, ${addr[0].city}`;
    $id("direccionCliente").textContent = addr[0].street || "—";
    $id("notaCliente").textContent = addr[0].postal_code || "—";
  }
}

/* =========================================================
   CARGAR PEDIDO EXISTENTE (MIS PEDIDOS)
========================================================= */
async function cargarPedidoExistente(orderId) {
  const sb = window.supabaseClient;

  const { data: pedido } = await sb
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
      payment_receipts(file_url,created_at)
    `)
    .eq("id", orderId)
    .single();

  if (!pedido) return showSnack("Pedido no encontrado");

  $id("numeroPedido").textContent =
    `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

  const fecha = new Date(pedido.created_at);
  $id("fechaPedido").textContent = fecha.toLocaleDateString("es-HN", {
    day: "2-digit", month: "short", year: "numeric"
  });
  $id("horaPedido").textContent = fecha.toLocaleTimeString("es-HN", {
    hour: "2-digit", minute: "2-digit", hour12: true
  });

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

  const lista = $id("listaProductos");
  lista.innerHTML = "";

  pedido.order_items.forEach(i => {
    lista.innerHTML += `
      <div class="cafe-item">
        <span>${i.products.name} (${i.quantity})</span>
        <span>L ${(i.quantity * i.price).toFixed(2)}</span>
      </div>`;
  });

  $id("totalPedido").textContent = pedido.total.toFixed(2);
  aplicarProgresoPedido(pedido.status, pedido.payment_method);

  if (pedido.payment_method === "bank_transfer") {
    bloqueDeposito?.classList.remove("hidden");

    if (pedido.payment_receipts?.length) {
      const receipt = pedido.payment_receipts.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )[0];

      previewBox.classList.remove("hidden");
      imgPreview.src = receipt.file_url;
      imgPreview.style.display = "block";

      btnSubirComprobante?.classList.add("hidden");
      inputFile?.classList.add("hidden");
    }
  }
}

/* =========================================================
   CARRITO (CHECKOUT)
========================================================= */
const lista = $id("listaProductos");
const carrito = JSON.parse(localStorage.getItem(CART_KEY)) || [];
let total = 0;

if (!IS_READ_ONLY && lista) {
  lista.innerHTML = "";
  carrito.forEach(it => {
    total += it.qty * it.price;
    lista.innerHTML += `
      <div class="cafe-item">
        <span>${it.name} (${it.qty})</span>
        <span>L ${(it.qty * it.price).toFixed(2)}</span>
      </div>`;
  });

  const totalEl = $id("totalPedido");
  if (totalEl) {
    totalEl.textContent = total.toFixed(2);
  }
}

/* =========================================================
   MÉTODO DE PAGO — UI CONTROL (FINAL LIMPIO)
========================================================= */
function resetMetodoPago() {
  bloqueDeposito?.classList.add("hidden");
  bloqueEfectivo?.classList.add("hidden");

  previewBox?.classList.add("hidden");
  imgPreview.src = "";

  btnSubirComprobante?.classList.remove("hidden");
  inputFile?.classList.remove("hidden");

  if (btnEnviar) btnEnviar.disabled = true;
  if (inputFile) inputFile.value = "";
}

if (metodoPago && !IS_READ_ONLY) {
  metodoPago.addEventListener("change", () => {
    resetMetodoPago();

    /* =========================
       DEPÓSITO BANCARIO
    ========================= */
    if (metodoPago.value === "bank_transfer") {
      bloqueDeposito?.classList.remove("hidden");
      // botón se habilita solo al subir imagen
    }

    /* =========================
       EFECTIVO (NUEVO)
    ========================= */
    if (
      metodoPago.value === "cash" ||
      metodoPago.value === "cash_on_delivery"
    ) {
      bloqueEfectivo?.classList.remove("hidden");
      btnEnviar.disabled = false;
    }
  });
}

/* =========================================================
   BOTÓN SUBIR COMPROBANTE — FIX MÓVIL
========================================================= */
btnSubirComprobante?.addEventListener("click", (e) => {
  e.preventDefault();
  inputFile?.click();
});

/* =========================================================
   PREVIEW COMPROBANTE + HABILITAR ENVIAR (ÚNICO)
========================================================= */
inputFile?.addEventListener("change", () => {
  if (!inputFile.files.length) {
    btnEnviar.disabled = true;
    return;
  }

  const file = inputFile.files[0];

  // Validar imagen
  if (!file.type.startsWith("image/")) {
    showSnack("Solo se permiten imágenes");
    inputFile.value = "";
    btnEnviar.disabled = true;
    return;
  }

  // Mostrar preview
  imgPreview.src = URL.createObjectURL(file);
  imgPreview.style.display = "block";
  previewBox?.classList.remove("hidden");

  // Habilitar envío
  btnEnviar.disabled = false;
});
/* =========================================================
   ENVIAR PEDIDO — FUNCIÓN DEFINITIVA
========================================================= */
async function enviarPedido() {
  console.log("🚀 enviarPedido() ejecutado");

  const sb = window.supabaseClient;
  const user = getUserCache();

  if (!user || !selectedAddressId) {
    showSnack("Faltan datos del cliente");
    return;
  }

  // Validar comprobante si es depósito
  if (
    metodoPago.value === "bank_transfer" &&
    !inputFile.files.length
  ) {
    showSnack("Debes subir el comprobante de pago");
    return;
  }

  btnEnviar.disabled = true;
  loader?.classList.remove("hidden");

  try {
    /* === 1. ÚLTIMO NÚMERO DE PEDIDO === */
    const { data: last, error: lastError } = await sb
      .from("orders")
      .select("order_number")
      .eq("user_id", user.id)
      .order("order_number", { ascending: false })
      .limit(1);

    if (lastError) throw lastError;

    const nextOrderNumber =
      (Number(last?.[0]?.order_number) || 0) + 1;

    /* === 2. CREAR PEDIDO === */
    const { data: order, error: insertError } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        address_id: selectedAddressId,
        order_number: nextOrderNumber,
        total,
        payment_method: metodoPago.value,
        status:
          metodoPago.value === "bank_transfer"
            ? "payment_review"
            : "cash_on_delivery"
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    /* === 3. ITEMS === */
const itemsPayload = carrito.map(it => ({
  order_id: order.id,
  product_id: it.product_id,
  quantity: it.qty,
  price: it.price
}));

console.log("🧾 ITEMS A INSERTAR:", itemsPayload);

const { data: itemsInserted, error: itemsError } = await sb
  .from("order_items")
  .insert(itemsPayload)
  .select();

if (itemsError) {
  console.error("❌ Error insertando order_items:", itemsError);
  throw itemsError;
}

console.log("✅ Items insertados:", itemsInserted);
     
/* === 3.1 DESCONTAR STOCK (CRÍTICO Y SEGURO) === */
for (const it of carrito) {
  // 1️⃣ Leer stock actual
  const { data: product, error: stockError } = await sb
    .from("products")
    .select("stock")
    .eq("id", it.product_id)
    .single();

  if (stockError || !product) {
    throw new Error(`Producto no encontrado: ${it.name}`);
  }

  // 2️⃣ Validar disponibilidad real
  if (product.stock < it.qty) {
    throw new Error(
      `Solo quedan ${product.stock} unidades disponibles de "${it.name}".`
    );
  }

  // 3️⃣ Descontar stock (anti-sobreventa real)
  const { data: updatedRows, error: updateError } = await sb
    .from("products")
    .update({
      stock: product.stock - it.qty
    })
    .eq("id", it.product_id)
    .gte("stock", it.qty)
    .select("id");

  if (updateError || !updatedRows || updatedRows.length === 0) {
    throw new Error(
      `El stock de "${it.name}" cambió. Solo quedan ${product.stock} unidades disponibles.`
    );
  }
}
     
    /* === 4. COMPROBANTE === */
    if (metodoPago.value === "bank_transfer") {
      const file = inputFile.files[0];
      const ext = file.name.split(".").pop().toLowerCase();
      const path = `${user.id}/${order.id}.${ext}`;

      const { error: uploadError } = await sb.storage
        .from(RECEIPT_BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = sb.storage
        .from(RECEIPT_BUCKET)
        .getPublicUrl(path);

      await sb.from("payment_receipts").insert({
        order_id: order.id,
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_path: path,
        review_status: "pending"
      });
    }

    /* === 5. LIMPIAR Y REDIRIGIR === */
    localStorage.setItem(CART_KEY, "[]");
    location.href = `recibo.html?id=${order.id}`;

  } catch (err) {
    console.error("❌ Error al enviar pedido:", err);
    showSnack("Error al enviar el pedido");
    btnEnviar.disabled = false;
  } finally {
    loader?.classList.add("hidden");
  }
}
/* =========================================================
   BOTÓN ENVIAR PEDIDO — FIX DEFINITIVO
========================================================= */
btnEnviar?.addEventListener("click", (e) => {
  e.preventDefault();
  enviarPedido();
});
/* =========================================================
   BOTÓN ATRÁS — FIX DEFINITIVO (RUTAS REALES)
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btn-back");

  if (!btnBack) {
    console.warn("⚠️ Botón atrás no encontrado");
    return;
  }

  btnBack.addEventListener("click", (e) => {
    e.preventDefault();

    location.href = IS_READ_ONLY
      ? "mis-pedidos.html"
      : "datos_cliente.html";
  });
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
