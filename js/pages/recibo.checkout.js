/**
 * 🧾 recibo.checkout.js — FINAL MATERIAL 3 EXPRESSIVE (SNACKBAR MASTER FIXED)
 */

console.log("🧾 recibo.checkout.js — INIT");

/* =========================================================
   GUARD
========================================================= */
if (window.IS_READ_ONLY) {
  throw new Error("Checkout bloqueado");
}

/* =========================================================
   HELPERS
========================================================= */
const $ = (id) => document.getElementById(id);

/* =========================================================
   UI
========================================================= */
const metodoPago = $("metodoPago");
const bloqueDeposito = $("pago-deposito");
const bloqueEfectivo = $("pago-efectivo");
const btnEnviar = $("btnEnviar");
const loader = $("loaderAccion");

const inputFile = $("inputComprobante");
const previewBox = $("previewComprobante");
const imgPreview = $("imgComprobante");
const btnSubir = $("btnSubirComprobante");

/* =========================================================
   STATE
========================================================= */
let selectedAddressId = null;
let totalPedido = 0;
let tempFile = null;

const CART_KEY = "cafecortero_cart";
const carrito = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

/* =========================================================
   PROVISIONAL (UI ONLY)
========================================================= */
async function pintarDatosProvisionales() {
  const sb = window.supabaseClient;
  const user = window.getUserCache();
  if (!sb || !user) return;

  const { data } = await sb
    .from("orders")
    .select("order_number")
    .eq("user_id", user.id)
    .order("order_number", { ascending: false })
    .limit(1);

  const next = (data?.[0]?.order_number || 0) + 1;
  const now = new Date();

  $("numeroPedido").textContent = String(next).padStart(3, "0");
  $("fechaPedido").textContent = now.toLocaleDateString("es-HN", {
    day: "2-digit", month: "short", year: "numeric"
  });
  $("horaPedido").textContent = now.toLocaleTimeString("es-HN", {
    hour: "2-digit", minute: "2-digit"
  });
}

/* =========================================================
   PREVIEW COMPROBANTE
========================================================= */
function mostrarPreview(file) {
  tempFile = file;
  imgPreview.src = URL.createObjectURL(file);
  previewBox.classList.remove("hidden");
  btnEnviar.disabled = false;
}

/* =========================================================
   DATOS CLIENTE
========================================================= */
async function cargarResumen() {
  const sb = window.supabaseClient;
  const user = window.getUserCache();
  if (!sb || !user) return;

  const { data: userRow } = await sb
    .from("users")
    .select("name,email,phone")
    .eq("id", user.id)
    .single();

  if (userRow) {
    $("nombreCliente").textContent = userRow.name;
    $("correoCliente").textContent = userRow.email;
    $("telefonoCliente").textContent = userRow.phone;
  }

  const { data: addr } = await sb
    .from("addresses")
    .select("id,state,city,street")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    selectedAddressId = addr[0].id;
    $("zonaCliente").textContent = `${addr[0].state}, ${addr[0].city}`;
    $("direccionCliente").textContent = addr[0].street;
  }

  $("notaCliente").textContent =
    sessionStorage.getItem("current_order_notes") || "Sin nota adicional";
}

/* =========================================================
   CARRITO
========================================================= */
function renderCarrito() {
  const lista = $("listaProductos");
  lista.innerHTML = "";
  totalPedido = 0;

  carrito.forEach(it => {
    const sub = it.qty * it.price;
    totalPedido += sub;
    lista.innerHTML += `
      <div class="cafe-item">
        <span>${it.name} × ${it.qty}</span>
        <strong>L ${sub.toFixed(2)}</strong>
      </div>`;
  });

  $("totalPedido").textContent = totalPedido.toFixed(2);
}

/* =========================================================
   MÉTODO DE PAGO
========================================================= */
function actualizarPago() {
  const v = metodoPago.value;
  bloqueDeposito.classList.toggle("hidden", v !== "bank_transfer");
  bloqueEfectivo.classList.toggle("hidden", v !== "cash");
  btnEnviar.disabled = v === "bank_transfer" && !tempFile;
}

/* =========================================================
   SNACKBAR — ÚNICO CONTROL
========================================================= */
function confirmarEnvio() {
  if (metodoPago.value === "bank_transfer" && !tempFile) {
    window.showSnack("Debes subir el comprobante");
    return;
  }

  window.showSnack(
    "¿Confirmar envío del pedido?",
    enviarPedido,   // ✅ único punto de creación
    "Editar",
    () => {}
  );
}

/* =========================================================
   ENVÍO FINAL — BLINDADO
========================================================= */
async function enviarPedido() {
  const sb = window.supabaseClient;
  const user = window.getUserCache();
  if (!user || !selectedAddressId) return;

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  try {
    /* 1️⃣ Número REAL */
    const { data: orderNumber, error: numErr } =
      await sb.rpc("next_order_number", { p_user_id: user.id });

    if (numErr || !orderNumber) {
      throw new Error("No se pudo generar número de pedido");
    }

    /* 2️⃣ Pedido */
    const { data: order, error } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        address_id: selectedAddressId,
        order_number: orderNumber,
        total: totalPedido,
        payment_method:
          metodoPago.value === "bank_transfer"
            ? "bank_transfer"
            : "cash_on_delivery",
        status: "pending"
      })
      .select("id, order_number, created_at")
      .single();

    if (error) throw error;

    /* 3️⃣ Items */
    await sb.from("order_items").insert(
      carrito.map(it => ({
        order_id: order.id,
        product_id: it.product_id,
        quantity: it.qty,
        price: it.price
      }))
    );

    /* 4️⃣ Comprobante */
    if (tempFile) {
      const ext = tempFile.name.split(".").pop();
      const path = `${user.id}/${order.id}.${ext}`;

      await sb.storage
        .from("payment-receipts")
        .upload(path, tempFile, { upsert: true });

      const { data } = sb.storage
        .from("payment-receipts")
        .getPublicUrl(path);

      await sb.from("payment_receipts").insert({
        order_id: order.id,
        user_id: user.id,
        file_url: data.publicUrl,
        file_path: path
      });
    }

    localStorage.setItem(CART_KEY, "[]");

    setTimeout(() => {
      location.href = `/pages/shop/recibo.html?id=${order.id}`;
    }, 1500);

  } catch (e) {
    console.error(e);
    window.showSnack("Error al enviar pedido");
    btnEnviar.disabled = false;
  } finally {
    loader.classList.add("hidden");
  }
}

/* =========================================================
   INIT
========================================================= */
(async function init() {
  await window.esperarSupabase();

  document.querySelector(".pedido-progreso")?.classList.add("hidden");

  await pintarDatosProvisionales();
  await cargarResumen();
  renderCarrito();
  actualizarPago();

  metodoPago.onchange = actualizarPago;
  btnSubir.onclick = () => inputFile.click();

  inputFile.onchange = () => {
    const f = inputFile.files[0];
    if (f && f.type.startsWith("image/")) mostrarPreview(f);
  };

  btnEnviar.onclick = confirmarEnvio;
})();
