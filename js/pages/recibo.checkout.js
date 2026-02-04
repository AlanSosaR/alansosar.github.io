/**
 * 🧾 recibo.checkout.js — FINAL MATERIAL 3 EXPRESSIVE (SNACKBAR REAL)
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
   ESTADO INICIAL
========================================================= */
btnEnviar.disabled = true;

/* =========================================================
   PROVISIONAL (SOLO UI)
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
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  $("horaPedido").textContent = now.toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* =========================================================
   PREVIEW COMPROBANTE
========================================================= */
function mostrarPreview(file) {
  tempFile = file;
  imgPreview.src = URL.createObjectURL(file);
  previewBox.classList.remove("hidden");
  validarBoton();
}

/* =========================================================
   VALIDACIÓN BOTÓN
========================================================= */
function validarBoton() {
  if (metodoPago.value === "cash") {
    btnEnviar.disabled = false;
    return;
  }

  if (metodoPago.value === "bank_transfer") {
    btnEnviar.disabled = !tempFile;
    return;
  }

  btnEnviar.disabled = true;
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

  validarBoton();
}

/* =========================================================
   SNACKBAR CONFIRMACIÓN REAL
========================================================= */
function mostrarConfirmacionEnvio() {
  const bar = $("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;width:100%;">
      <span class="snack-text">¿Confirmar envío del pedido?</span>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button id="snack-editar"
          style="background:none;border:none;color:#fff;font-weight:600;cursor:pointer;">
          Editar
        </button>
        <button id="snack-confirmar"
          style="background:#2e7d32;border:none;color:#fff;font-weight:600;
                 cursor:pointer;padding:8px 16px;border-radius:8px;">
          Confirmar
        </button>
      </div>
    </div>
  `;

  bar.classList.add("show");

  $("snack-editar").onclick = () => bar.classList.remove("show");
  $("snack-confirmar").onclick = () => {
    bar.classList.remove("show");
    enviarPedido();
  };
}

/* =========================================================
   CLICK EN ENVIAR
========================================================= */
function confirmarEnvio() {
  if (btnEnviar.disabled) return;

  if (metodoPago.value === "bank_transfer" && !tempFile) {
    window.showSnack("Debes subir el comprobante");
    return;
  }

  mostrarConfirmacionEnvio();
}

/* =========================================================
   ENVÍO FINAL
========================================================= */
async function enviarPedido() {
  const sb = window.supabaseClient;
  const user = window.getUserCache();
  if (!user || !selectedAddressId) return;

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  try {
    const { data: orderNumber } =
      await sb.rpc("next_order_number", { p_user_id: user.id });

    const { data: order } = await sb
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
      .select("id")
      .single();

    await sb.from("order_items").insert(
      carrito.map(it => ({
        order_id: order.id,
        product_id: it.product_id,
        quantity: it.qty,
        price: it.price
      }))
    );

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
    }, 1200);

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
  validarBoton();

  metodoPago.onchange = actualizarPago;
  btnSubir.onclick = () => inputFile.click();

  inputFile.onchange = () => {
    const f = inputFile.files[0];
    if (f && f.type.startsWith("image/")) mostrarPreview(f);
  };

  btnEnviar.onclick = confirmarEnvio;
})();
