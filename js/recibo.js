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
   MÉTODO DE PAGO (CHECKOUT) — CORREGIDO FINAL
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
  const steps = document.querySelectorAll("#pedido-progreso-recibo .step");
  const lines = document.querySelectorAll("#pedido-progreso-recibo .line");
  const estadoTexto = document.getElementById("estadoPedidoTexto");

  let map = {};
  let labels = {};

  /* =========================
     DEPÓSITO BANCARIO
  ========================= */
  if (paymentMethod === "bank_transfer") {
    map = {
      pending_payment: 0,
      payment_review: 1,
      payment_confirmed: 2,
      processing: 2,
      shipped: 3,
      delivered: 3
    };

    labels = {
      pending_payment: "Pendiente de pago",
      payment_review: "Pago en revisión",
      payment_confirmed: "Pago confirmado",
      processing: "En preparación",
      shipped: "Enviado",
      delivered: "Entregado"
    };
  }

  /* =========================
     PAGO EN EFECTIVO
  ========================= */
  else {
    map = {
  cash_on_delivery: 0,
  processing: 1,
  shipped: 2,
  delivered: 3
};

labels = {
  cash_on_delivery: "Pago al recibir",
  processing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado"
};
  }

  const active = map[status] ?? 0;

  steps.forEach((s, i) => s.classList.toggle("active", i <= active));
  lines.forEach((l, i) => l.classList.toggle("active", i < active));

  if (estadoTexto) {
    estadoTexto.textContent = labels[status] || "Pendiente";
  }
}

/* =========================================================
   NÚMERO PROVISIONAL (CHECKOUT)
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
  $id("fechaPedido").textContent = new Date().toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: true
  });
}

/* =========================================================
   DATOS CLIENTE
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
    $id("zonaCliente").textContent = `${addr[0].state}, ${addr[0].city}`;
    $id("direccionCliente").textContent = addr[0].street || "";
    $id("notaCliente").textContent = addr[0].postal_code || "";
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
      payment_receipts(file_url)
    `)
    .eq("id", orderId)
    .single();

  if (!pedido) {
    showSnack("Pedido no encontrado");
    return;
  }

  /* =========================
     DATOS GENERALES
  ========================= */
  $id("numeroPedido").textContent = pedido.order_number;
  $id("fechaPedido").textContent = new Date(pedido.created_at).toLocaleString("es-HN");

  if (pedido.users) {
    $id("nombreCliente").textContent = pedido.users.name || "";
    $id("correoCliente").textContent = pedido.users.email || "";
    $id("telefonoCliente").textContent = pedido.users.phone || "";
  }

  if (pedido.addresses) {
    $id("zonaCliente").textContent = `${pedido.addresses.state}, ${pedido.addresses.city}`;
    $id("direccionCliente").textContent = pedido.addresses.street || "";
    $id("notaCliente").textContent = pedido.addresses.postal_code || "";
  }

  /* =========================
     PRODUCTOS
  ========================= */
  const lista = $id("listaProductos");
  lista.innerHTML = "";

  pedido.order_items.forEach(i => {
    lista.innerHTML += `
      <div class="cafe-item">
        <span>${i.products.name} (${i.quantity})</span>
        <span>L ${(i.quantity * i.price).toFixed(2)}</span>
      </div>
    `;
  });

  $id("totalPedido").textContent = pedido.total.toFixed(2);

  /* =========================
     PROGRESO
  ========================= */
  aplicarProgresoPedido(pedido.status, pedido.payment_method);

  /* =========================
     UI SOLO LECTURA
  ========================= */
  document.querySelector(".pago-select-label")?.classList.add("hidden");
  document.querySelector(".recibo-botones")?.classList.add("hidden");

  btnSubirComprobante?.classList.add("hidden");
  inputFile?.classList.add("hidden");

  /* =========================
     PAGO EN EFECTIVO
  ========================= */
  if (pedido.payment_method === "cash") {
    bloqueEfectivo?.classList.remove("hidden");
  }

/* =========================
   DEPÓSITO BANCARIO
========================= */
if (pedido.payment_method === "bank_transfer") {
  bloqueDeposito?.classList.remove("hidden");

  // 🔑 FIX CLAVE — forzar layout visible (ANDROID / CHROME)
  bloqueDeposito.style.display = "flex";
  bloqueDeposito.style.flexDirection = "column";

  // 🔕 ocultar instrucciones
  bloqueDeposito
    ?.querySelector(".pago-instrucciones")
    ?.classList.add("hidden");

  /* =========================
     COMPROBANTE DESDE BD
     FIX DEFINITIVO
  ========================= */
  if (
    pedido.payment_receipts &&
    pedido.payment_receipts.length > 0
  ) {
    // 🔑 tomar el comprobante MÁS RECIENTE
    const receipt = pedido.payment_receipts
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    // asegurar que el preview esté dentro del bloque visible
    bloqueDeposito.appendChild(previewBox);

    // 🔓 forzar visibilidad REAL
    previewBox.classList.remove("hidden");
    previewBox.style.display = "block";
    previewBox.style.visibility = "visible";
    previewBox.style.position = "relative";
    previewBox.style.overflow = "visible";

    imgPreview.style.display = "block";
    imgPreview.style.visibility = "visible";
    imgPreview.style.width = "100%";
    imgPreview.style.height = "auto";
    imgPreview.style.objectFit = "contain";

    imgPreview.onerror = () => {
      console.error("❌ No se pudo cargar el comprobante");
    };

    // 🔑 asignar src DEL COMPROBANTE CORRECTO
    imgPreview.src = receipt.file_url;

    console.log("🧾 comprobante mostrado correctamente:", receipt.file_url);
  }
}
}
/* =========================================================
   CARRITO (CHECKOUT)
========================================================= */
const lista = $id("listaProductos");
const carrito = JSON.parse(localStorage.getItem(CART_KEY)) || [];
let total = 0;

if (!IS_READ_ONLY) {
  lista.innerHTML = "";
  carrito.forEach(it => {
    total += it.qty * it.price;
    lista.innerHTML += `
      <div class="cafe-item">
        <span>${it.name} (${it.qty})</span>
        <span>L ${(it.qty * it.price).toFixed(2)}</span>
      </div>`;
  });
  $id("totalPedido").textContent = total.toFixed(2);
}



/* =========================
   RESET UI
========================= */
function resetMetodoPago() {
  bloqueDeposito?.classList.add("hidden");
  bloqueEfectivo?.classList.add("hidden");
  previewBox?.classList.add("hidden");
  btnEnviar && (btnEnviar.disabled = true);

  if (inputFile) inputFile.value = ""; // limpiar input
}

/* =========================
   CAMBIO MÉTODO DE PAGO
========================= */
metodoPago?.addEventListener("change", () => {
  if (IS_READ_ONLY) return;

  resetMetodoPago();

  if (metodoPago.value === "cash") {
    bloqueEfectivo?.classList.remove("hidden");
    btnEnviar.disabled = false;
  }

  if (metodoPago.value === "bank_transfer") {
    bloqueDeposito?.classList.remove("hidden");
  }
});

/* =========================
   BOTÓN SUBIR COMPROBANTE
========================= */
btnSubirComprobante?.addEventListener("click", (e) => {
  e.preventDefault();
  inputFile?.click(); // 🔑 abre galería / archivos
});

/* =========================
   PREVIEW COMPROBANTE
========================= */
inputFile?.addEventListener("change", () => {
  if (!inputFile.files.length) {
    btnEnviar.disabled = true;
    return;
  }

  const file = inputFile.files[0];

  // solo imágenes
  if (!file.type.startsWith("image/")) {
    showSnack("Solo se permiten imágenes");
    inputFile.value = "";
    btnEnviar.disabled = true;
    return;
  }

  imgPreview.src = URL.createObjectURL(file);
  previewBox?.classList.remove("hidden");
  btnEnviar.disabled = false;
});

/* =========================
   CLICK EN ENVIAR PEDIDO
   🔑 ESTO ERA LO QUE FALTABA
========================= */
btnEnviar?.addEventListener("click", (e) => {
  e.preventDefault();
  enviarPedido();
});

/* =========================================================
   ENVIAR PEDIDO — DEFINITIVO + COMPROBANTE
========================================================= */
async function enviarPedido() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user || !selectedAddressId) return;

  // 🔒 Validar comprobante si es depósito
  if (metodoPago.value === "bank_transfer" && !inputFile.files.length) {
    showSnack("Debes subir el comprobante de pago");
    return;
  }

  btnEnviar.disabled = true;
  loader?.classList.remove("hidden");

  try {
    /* === 1. NÚMERO DE PEDIDO === */
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
    await sb.from("order_items").insert(
      carrito.map(it => ({
        order_id: order.id,
        product_id: it.product_id,
        quantity: it.qty,
        price: it.price
      }))
    );

/* === 4. SUBIR COMPROBANTE === */
if (metodoPago.value === "bank_transfer") {
  const file = inputFile.files[0];
  if (!file) throw new Error("No hay archivo de comprobante");

  const ext = file.name.split(".").pop().toLowerCase();
  const path = `${user.id}/${order.id}.${ext}`;

  /* === 4.1 SUBIR ARCHIVO === */
  const { error: uploadError } = await sb.storage
    .from(RECEIPT_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type
    });

  if (uploadError) throw uploadError;

  /* === 4.2 URL PÚBLICA === */
  const { data: urlData } = sb.storage
    .from(RECEIPT_BUCKET)
    .getPublicUrl(path);

  /* === 4.3 INSERT BD (🔑 FIX REAL) === */
  const { error: receiptError } = await sb
    .from("payment_receipts")
    .insert({
      order_id: order.id,
      file_url: urlData.publicUrl,
      file_path: path
      // ❌ NO user_id
      // ❌ NO review_status
    });

  if (receiptError) {
    console.error("❌ Error insert payment_receipts:", receiptError);
    throw receiptError;
  }
}
    /* === 5. LIMPIAR Y REDIRIGIR === */
    localStorage.setItem(CART_KEY, "[]");
    location.href = `recibo.html?id=${order.id}`;

  } catch (err) {
    console.error("❌ Error pedido:", err);
    showSnack("Error al enviar pedido");
    btnEnviar.disabled = false;
  } finally {
    loader?.classList.add("hidden");
  }
}
/* =========================================================
   BOTÓN ATRÁS
========================================================= */
$id("btn-back")?.addEventListener("click", () => {
  location.href = IS_READ_ONLY ? "mis-pedidos.html" : "datos_cliente.html";
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
