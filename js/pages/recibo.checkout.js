/**
 * 🧾 recibo.checkout.js — FINAL MATERIAL 3 EXPRESSIVE (FIXED)
 * ---------------------------------------------------------
 * Checkout ONLY (no vista, no lectura)
 */

console.log("🧾 recibo.checkout.js — INIT");

/* =========================================================
   GUARD
========================================================= */
if (window.IS_READ_ONLY) {
  console.warn("⛔ Checkout abortado (modo READ_ONLY)");
  throw new Error("Checkout bloqueado");
}

/* =========================================================
   ELEMENTOS UI
========================================================= */
const $ = (id) => document.getElementById(id);

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

const carrito = JSON.parse(localStorage.getItem("cafecortero_cart") || "[]");

/* =========================================================
   NÚMERO / FECHA / HORA — PROVISIONAL (CLAVE)
========================================================= */
async function pintarDatosProvisionales() {
  const sb = window.supabaseClient;
  const user = window.getUserCache?.();
  if (!sb || !user) return;

  try {
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
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    $("horaPedido").textContent = now.toLocaleTimeString("es-HN", {
      hour: "2-digit",
      minute: "2-digit"
    });

  } catch (e) {
    console.warn("No se pudo generar número provisional");
  }
}

/* =========================================================
   IMAGEN — PREVIEW
========================================================= */
function guardarImagenTemporal(file) {
  const reader = new FileReader();
  reader.onload = e => {
    sessionStorage.setItem("temp_receipt_base64", e.target.result);
    imgPreview.src = e.target.result;
    previewBox.classList.remove("hidden");
    btnEnviar.disabled = false;
  };
  reader.readAsDataURL(file);
}

/* =========================================================
   DATOS INICIALES
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
    $("nombreCliente").textContent = userRow.name || "—";
    $("correoCliente").textContent = userRow.email || "—";
    $("telefonoCliente").textContent = userRow.phone || "—";
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
  if (!lista) return;

  lista.innerHTML = "";
  totalPedido = 0;

  carrito.forEach(it => {
    const subtotal = it.qty * it.price;
    totalPedido += subtotal;

    lista.insertAdjacentHTML("beforeend", `
      <div class="cafe-item">
        <span>${it.name} × ${it.qty}</span>
        <strong>L ${subtotal.toFixed(2)}</strong>
      </div>
    `);
  });

  $("totalPedido").textContent = totalPedido.toFixed(2);
}

/* =========================================================
   MÉTODO DE PAGO
========================================================= */
function actualizarPago() {
  const val = metodoPago.value;

  bloqueDeposito.classList.toggle("hidden", val !== "bank_transfer");
  bloqueEfectivo.classList.toggle("hidden", val !== "cash");

  if (val === "bank_transfer") {
    btnEnviar.disabled = !sessionStorage.getItem("temp_receipt_base64");
  } else {
    btnEnviar.disabled = false;
  }
}

/* =========================================================
   ENVÍO FINAL
========================================================= */
async function enviarPedido() {
  const sb = window.supabaseClient;
  const user = window.getUserCache();

  if (!user || !selectedAddressId) {
    window.showSnack("Faltan datos del pedido");
    return;
  }

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  try {
    const { data: order, error } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        address_id: selectedAddressId,
        total: totalPedido,
        payment_method: metodoPago.value,
        status: "pending",
        order_notes: sessionStorage.getItem("current_order_notes") || ""
      })
      .select("id, order_number, created_at")
      .single();

    if (error) throw error;

    // 🔑 PINTAR DATOS REALES
    const fecha = new Date(order.created_at);

    $("numeroPedido").textContent =
      String(order.order_number).padStart(3, "0");

    $("fechaPedido").textContent = fecha.toLocaleDateString("es-HN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    $("horaPedido").textContent = fecha.toLocaleTimeString("es-HN", {
      hour: "2-digit",
      minute: "2-digit"
    });

    // Insertar items
    await sb.from("order_items").insert(
      carrito.map(it => ({
        order_id: order.id,
        product_id: it.product_id,
        quantity: it.qty,
        price: it.price
      }))
    );

    localStorage.setItem("cafecortero_cart", "[]");

    setTimeout(() => {
      location.href = `/pages/shop/recibo.html?id=${order.id}`;
    }, 2000);

  } catch (err) {
    console.error(err);
    window.showSnack("Error al procesar pedido");
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

  // Ocultar progreso en checkout
  document.querySelector(".pedido-progreso")?.classList.add("hidden");

  await pintarDatosProvisionales();
  await cargarResumen();
  renderCarrito();
  actualizarPago();

  metodoPago.addEventListener("change", actualizarPago);
  btnSubir.addEventListener("click", e => {
    e.preventDefault();
    inputFile.click();
  });

  inputFile.addEventListener("change", () => {
    const f = inputFile.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    guardarImagenTemporal(f);
  });

  btnEnviar.addEventListener("click", enviarPedido);
})();
