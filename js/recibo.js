console.log("🧾 recibo.js — CORE FINAL (CORREGIDO)");

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
   PROGRESO DEL PEDIDO (LECTURA REAL DESDE STATUS)
========================================================= */
function aplicarProgresoPedido(status) {
  const steps = document.querySelectorAll("#pedido-progreso-recibo .step");
  const lines = document.querySelectorAll("#pedido-progreso-recibo .line");
  const estadoTexto = $id("estadoPedidoTexto");

  // 0=Pag, 1=Rev, 2=Conf, 3=Envío (según tu barra de 4 puntos)
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

  // círculos (step): activo hasta el índice activos
  steps.forEach((step, i) => step.classList.toggle("active", i <= activos));
  // líneas: activo si su índice es menor que activos
  lines.forEach((line, i) => line.classList.toggle("active", i < activos));

  if (estadoTexto) estadoTexto.textContent = labels[status] || "Pendiente de pago";
}

/* =========================================================
   NÚMERO PROVISIONAL (CHECKOUT)
========================================================= */
async function setNumeroPedidoProvisional() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  const { data, error } = await sb
    .from("orders")
    .select("order_number")
    .eq("user_id", user.id)
    .order("order_number", { ascending: false })
    .limit(1);

  if (error) console.warn("⚠️ No se pudo leer order_number previo:", error);

  const last = data?.length ? Number(data[0].order_number) : 0;
  const siguiente = (Number.isFinite(last) ? last : 0) + 1;

  $id("numeroPedido").textContent = String(siguiente);
  $id("fechaPedido").textContent = new Date().toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: true
  });
}

/* =========================================================
   DATOS CLIENTE (CHECKOUT) + GUARDAR address_id PARA EL PEDIDO
========================================================= */
let selectedAddressId = null;

async function cargarDatosCliente() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  const { data: userRow, error: uErr } = await sb
    .from("users")
    .select("name,email,phone")
    .eq("id", user.id)
    .single();

  if (uErr) console.warn("⚠️ users no cargó:", uErr);

  if (userRow) {
    $id("nombreCliente").textContent = userRow.name || "";
    $id("correoCliente").textContent = userRow.email || "";
    $id("telefonoCliente").textContent = userRow.phone || "";
  }

  // 🔑 acá sacamos LA DIRECCIÓN REAL (id incluido)
  const { data: addr, error: aErr } = await sb
    .from("addresses")
    .select("id,state,city,street,postal_code")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (aErr) console.warn("⚠️ addresses no cargó:", aErr);

  if (addr?.length) {
    selectedAddressId = addr[0].id;

    // Zona = state + city
    $id("zonaCliente").textContent = [addr[0].state, addr[0].city].filter(Boolean).join(", ");
    $id("direccionCliente").textContent = addr[0].street || "";
    $id("notaCliente").textContent = addr[0].postal_code || "";
  }
}

/* =========================================================
   CARGAR PEDIDO EXISTENTE (MIS PEDIDOS) — CORREGIDO
   - Incluye user_id y address_id
   - Join explícito por FKs
   - Fallback si no trae addresses (ej: pedido sin address_id)
========================================================= */
async function cargarPedidoExistente(orderId) {
  const sb = window.supabaseClient;

  const { data: pedido, error } = await sb
    .from("orders")
    .select(
      `
      id,
      user_id,
      address_id,
      order_number,
      created_at,
      total,
      payment_method,
      status,

      users:users!orders_user_id_fkey (
        name,
        email,
        phone
      ),

      addresses:addresses!orders_address_id_fkey (
        id,
        state,
        city,
        street,
        postal_code
      ),

      order_items (
        quantity,
        price,
        products (
          name
        )
      ),

      payment_receipts (
        file_url
      )
    `
    )
    .eq("id", orderId)
    .single();

  if (error || !pedido) {
    console.error("❌ Pedido no encontrado", error);
    showSnack("Pedido no encontrado");
    return;
  }

  /* ================= HEADER ================= */
  $id("numeroPedido").textContent = pedido.order_number;
  $id("fechaPedido").textContent = new Date(pedido.created_at).toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: true
  });

  /* ================= DATOS CLIENTE (users) ================= */
  if (pedido.users) {
    $id("nombreCliente").textContent = pedido.users.name || "";
    $id("correoCliente").textContent = pedido.users.email || "";
    $id("telefonoCliente").textContent = pedido.users.phone || "";
  }

  /* ================= DIRECCIÓN (addresses) ================= */
  // 1) si vino por join: pedido.addresses
  // 2) si NO vino (porque el pedido no tiene address_id), fallback a última address del user_id
  let addr = pedido.addresses || null;

  if (!addr && pedido.user_id) {
    const { data: a2, error: e2 } = await sb
      .from("addresses")
      .select("id,state,city,street,postal_code")
      .eq("user_id", pedido.user_id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (e2) console.warn("⚠️ fallback addresses error:", e2);
    if (a2?.length) addr = a2[0];
  }

  if (addr) {
    $id("zonaCliente").textContent = [addr.state, addr.city].filter(Boolean).join(", ");
    $id("direccionCliente").textContent = addr.street || "";
    $id("notaCliente").textContent = addr.postal_code || "";
  } else {
    $id("zonaCliente").textContent = "";
    $id("direccionCliente").textContent = "";
    $id("notaCliente").textContent = "";
  }

  /* ================= PRODUCTOS ================= */
  if (lista) {
    lista.innerHTML = "";
    (pedido.order_items || []).forEach((item) => {
      const nombre = item?.products?.name || "";
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;

      lista.innerHTML += `
        <div class="cafe-item">
          <span class="cafe-nombre">${nombre} (${qty} bolsas)</span>
          <span class="cafe-precio">L ${(qty * price).toFixed(2)}</span>
        </div>
      `;
    });
  }

  $id("totalPedido").textContent = Number(pedido.total || 0).toFixed(2);

  /* ================= MÉTODO DE PAGO ================= */
  if (metodoPago) metodoPago.value = pedido.payment_method || "";

  resetMetodoPago();

  if (pedido.payment_method === "cash") {
    bloqueEfectivo?.classList.remove("hidden");
  }

  if (pedido.payment_method === "bank_transfer") {
    bloqueDeposito?.classList.remove("hidden");
    if (pedido.payment_receipts?.length) {
      imgPreview.src = pedido.payment_receipts[0].file_url;
      previewBox?.classList.remove("hidden");
    }
  }

  /* ================= PROGRESO ================= */
  aplicarProgresoPedido(pedido.status);
}

/* =========================================================
   CARRITO (SOLO CHECKOUT)
========================================================= */
const lista = $id("listaProductos");
const carrito = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
let total = 0;

if (lista && !IS_READ_ONLY) {
  lista.innerHTML = "";
  carrito.forEach((item) => {
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

function resetMetodoPago() {
  bloqueDeposito?.classList.add("hidden");
  bloqueEfectivo?.classList.add("hidden");
  previewBox?.classList.add("hidden");
  if (btnEnviar) btnEnviar.disabled = true;
}

/* =========================================================
   UI PAGO (CHECKOUT)
========================================================= */
function validarBotonEnviar() {
  if (IS_READ_ONLY) return;

  const metodo = metodoPago?.value || "";
  if (!btnEnviar) return;

  if (!metodo) {
    btnEnviar.disabled = true;
    return;
  }

  if (metodo === "cash") {
    btnEnviar.disabled = false;
    return;
  }

  if (metodo === "bank_transfer") {
    // obligar comprobante
    const hasFile = inputFile?.files?.length;
    btnEnviar.disabled = !hasFile;
    return;
  }

  btnEnviar.disabled = true;
}

if (metodoPago && !IS_READ_ONLY) {
  metodoPago.addEventListener("change", () => {
    resetMetodoPago();

    const metodo = metodoPago.value;

    if (metodo === "cash") {
      bloqueEfectivo?.classList.remove("hidden");
    }

    if (metodo === "bank_transfer") {
      bloqueDeposito?.classList.remove("hidden");
    }

    validarBotonEnviar();
  });
}

if (inputFile && !IS_READ_ONLY) {
  inputFile.addEventListener("change", () => {
    const file = inputFile.files?.[0];
    if (!file) {
      previewBox?.classList.add("hidden");
      validarBotonEnviar();
      return;
    }

    const url = URL.createObjectURL(file);
    if (imgPreview) imgPreview.src = url;
    previewBox?.classList.remove("hidden");

    validarBotonEnviar();
  });
}

/* =========================================================
   ENVIAR PEDIDO (CREA TODO EN BD)
   - orders (con address_id)
   - order_items
   - (opcional) payment_receipts si bank_transfer
========================================================= */
const CART_KEY = "cafecortero_cart";
const RECEIPT_BUCKET = "payment_receipts"; // si tu bucket se llama distinto, cambia SOLO esto

async function subirComprobante(file, orderId) {
  const sb = window.supabaseClient;

  // nombre único
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${orderId}/${Date.now()}.${ext}`;

  const up = await sb.storage.from(RECEIPT_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (up.error) throw up.error;

  // url pública
  const pub = sb.storage.from(RECEIPT_BUCKET).getPublicUrl(path);
  const file_url = pub?.data?.publicUrl;

  if (!file_url) throw new Error("No se pudo obtener publicUrl del comprobante");

  // guardar en tabla payment_receipts
  const ins = await sb.from("payment_receipts").insert({
    order_id: orderId,
    file_url
  });

  if (ins.error) throw ins.error;

  return file_url;
}

async function enviarPedido() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  const metodo = metodoPago?.value || "";
  if (!metodo) {
    showSnack("Selecciona un método de pago");
    return;
  }

  // 🔑 address_id obligatorio para que luego MIS PEDIDOS jale zona/dirección/nota
  if (!selectedAddressId) {
    showSnack("No se encontró dirección. Completa tus datos de entrega.");
    return;
  }

  if (metodo === "bank_transfer") {
    const file = inputFile?.files?.[0];
    if (!file) {
      showSnack("Sube tu comprobante para enviar el pedido");
      return;
    }
  }

  // UI loading
  if (btnEnviar) btnEnviar.disabled = true;
  loader?.classList.remove("hidden");

  try {
    // 1) Crear orden
    const status =
      metodo === "cash" ? "cash_on_delivery" :
      metodo === "bank_transfer" ? "payment_review" :
      "pending_payment";

    const { data: orderRow, error: oErr } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        address_id: selectedAddressId, // ✅ CLAVE
        total: Number($id("totalPedido")?.textContent || total || 0),
        payment_method: metodo,
        status
      })
      .select("id,order_number,created_at,total,payment_method,status")
      .single();

    if (oErr || !orderRow) throw (oErr || new Error("No se pudo crear la orden"));

    // 2) Crear items
    const itemsPayload = (carrito || []).map((it) => ({
      order_id: orderRow.id,
      product_id: it.id,      // si tu carrito guarda el id del producto como it.id (como ya vienes usando)
      quantity: it.qty,
      price: Number(it.price) || 0
    }));

    if (itemsPayload.length) {
      const { error: iErr } = await sb.from("order_items").insert(itemsPayload);
      if (iErr) throw iErr;
    }

    // 3) Si es transferencia: subir comprobante + insertar payment_receipts
    if (metodo === "bank_transfer") {
      const file = inputFile.files[0];
      const url = await subirComprobante(file, orderRow.id);
      if (imgPreview) imgPreview.src = url;
      previewBox?.classList.remove("hidden");
    }

    // 4) Vaciar carrito SOLO al enviar pedido (como pediste)
    localStorage.setItem(CART_KEY, JSON.stringify([]));

    // 5) Ir a modo lectura del pedido (mis pedidos)
    window.location.href = `recibo.html?id=${orderRow.id}`;
  } catch (err) {
    console.error("❌ Error enviando pedido:", err);
    showSnack("No se pudo enviar el pedido. Revisa e intenta de nuevo.");
    if (btnEnviar) btnEnviar.disabled = false;
  } finally {
    loader?.classList.add("hidden");
  }
}

if (btnEnviar && !IS_READ_ONLY) {
  btnEnviar.addEventListener("click", (e) => {
    e.preventDefault();
    enviarPedido();
  });
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
    await setNumeroPedidoProvisional();
    await cargarDatosCliente();
    resetMetodoPago();
    validarBotonEnviar();
  }
})();
