/**
 * 🧾 recibo.checkout.js — FINAL MATERIAL 3 EXPRESSIVE (STABLE)
 * ---------------------------------------------------------
 * Checkout ONLY (no vista, no lectura)
 */

console.log("🧾 recibo.checkout.js — INIT");

/* =========================================================
   GUARD: NO EJECUTAR EN MODO SOLO LECTURA
========================================================= */
if (window.IS_READ_ONLY) {
  console.warn("⛔ recibo.checkout.js abortado (modo READ_ONLY)");
  throw new Error("Checkout bloqueado en modo solo lectura");
}

/* =========================================================
   ELEMENTOS UI
========================================================= */
const metodoPago      = document.getElementById("metodoPago");
const bloqueDeposito  = document.getElementById("pago-deposito");
const bloqueEfectivo  = document.getElementById("pago-efectivo");
const btnEnviar       = document.getElementById("btnEnviar");
const loader          = document.getElementById("loaderAccion");

const inputFile       = document.getElementById("inputComprobante");
const previewBox      = document.getElementById("previewComprobante");
const imgPreview      = document.getElementById("imgComprobante");
const btnSubir        = document.getElementById("btnSubirComprobante");

/* =========================================================
   STATE
========================================================= */
let selectedAddressId = null;
let totalPedido       = 0;

const carrito = JSON.parse(
  localStorage.getItem("cafecortero_cart") || "[]"
);

/* =========================================================
   IMAGEN — PERSISTENCIA
========================================================= */
function guardarImagenTemporal(file) {
  const reader = new FileReader();
  reader.onload = e => {
    sessionStorage.setItem("temp_receipt_base64", e.target.result);
    mostrarPreview(e.target.result);
  };
  reader.readAsDataURL(file);
}

function mostrarPreview(src) {
  if (!imgPreview || !previewBox) return;

  imgPreview.src = src;
  previewBox.classList.remove("hidden");
  btnEnviar.disabled = false;
}

/* =========================================================
   SNACKBAR CONFIRMACIÓN
========================================================= */
function confirmarEnvio(texto, onConfirm) {
  const bar = document.getElementById("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <span class="snack-text">${texto}</span>
      <div style="display:flex;gap:8px;">
        <button id="snack-cancel" class="snack-action secondary">Editar</button>
        <button id="snack-ok" class="snack-action primary">Confirmar</button>
      </div>
    </div>
  `;

  bar.classList.add("show");

  document.getElementById("snack-cancel").onclick = () =>
    bar.classList.remove("show");

  document.getElementById("snack-ok").onclick = () => {
    bar.classList.remove("show");
    onConfirm();
  };
}

/* =========================================================
   DATOS INICIALES
========================================================= */
async function cargarResumen() {
  const sb   = window.supabaseClient;
  const user = window.getUserCache();
  if (!sb || !user) return;

  // Cliente
  const { data: userRow } = await sb
    .from("users")
    .select("name,email,phone")
    .eq("id", user.id)
    .single();

  if (userRow) {
    document.getElementById("nombreCliente").textContent   = userRow.name || "—";
    document.getElementById("correoCliente").textContent   = userRow.email || "—";
    document.getElementById("telefonoCliente").textContent = userRow.phone || "—";
  }

  // Dirección
  const { data: addr } = await sb
    .from("addresses")
    .select("id,state,city,street")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    selectedAddressId = addr[0].id;
    document.getElementById("zonaCliente").textContent      = `${addr[0].state}, ${addr[0].city}`;
    document.getElementById("direccionCliente").textContent = addr[0].street;
  }

  // Nota
  document.getElementById("notaCliente").textContent =
    sessionStorage.getItem("current_order_notes") || "Sin nota adicional";
}

/* =========================================================
   RESUMEN DE CARRITO
========================================================= */
function renderCarrito() {
  const lista = document.getElementById("listaProductos");
  if (!lista) return;

  lista.innerHTML = "";
  totalPedido = 0;

  if (!carrito.length) {
    lista.innerHTML = "<p class='empty-msg'>Tu carrito está vacío</p>";
    return;
  }

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

  document.getElementById("totalPedido").textContent =
    totalPedido.toFixed(2);
}

/* =========================================================
   MÉTODO DE PAGO
========================================================= */
function actualizarPago() {
  const val = metodoPago.value;

  bloqueDeposito?.classList.toggle("hidden", val !== "bank_transfer");
  bloqueEfectivo?.classList.toggle("hidden", val !== "cash");

  if (val === "bank_transfer") {
    const img = sessionStorage.getItem("temp_receipt_base64");
    btnEnviar.disabled = !img;
    if (img) mostrarPreview(img);
  } else {
    btnEnviar.disabled = false;
  }
}

/* =========================================================
   ENVÍO FINAL
========================================================= */
async function enviarPedido() {
  const sb   = window.supabaseClient;
  const user = window.getUserCache();
  if (!sb || !user || !selectedAddressId) {
    window.showSnack("Faltan datos del pedido");
    return;
  }

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  try {
    // ORDEN
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
      .select("id, order_number")
      .single();

    if (error) throw error;

    // ITEMS
    await sb.from("order_items").insert(
      carrito.map(it => ({
        order_id: order.id,
        product_id: it.product_id,
        quantity: it.qty,
        price: it.price
      }))
    );

    // COMPROBANTE
    if (metodoPago.value === "bank_transfer") {
      const base64 = sessionStorage.getItem("temp_receipt_base64");
      if (base64) {
        const blob = await (await fetch(base64)).blob();
        const path = `${user.id}/${order.id}_${Date.now()}.png`;

        await sb.storage.from("payment-receipts").upload(path, blob);
        const { data } = sb.storage.from("payment-receipts").getPublicUrl(path);

        await sb.from("payment_receipts").insert({
          order_id: order.id,
          user_id: user.id,
          file_url: data.publicUrl,
          file_path: path
        });
      }
    }

    // NOTIFICACIÓN
    await sb.functions.invoke("notify-new-order", {
      body: { orderId: order.id, number: order.order_number }
    });

    // LIMPIEZA
    localStorage.setItem("cafecortero_cart", "[]");
    sessionStorage.removeItem("temp_receipt_base64");

    window.location.href = `recibo.html?id=${order.id}`;

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

  metodoPago?.addEventListener("change", actualizarPago);
  btnSubir?.addEventListener("click", e => {
    e.preventDefault();
    inputFile?.click();
  });

  inputFile?.addEventListener("change", () => {
    const f = inputFile.files[0];
    if (!f || !f.type.startsWith("image/")) {
      window.showSnack("Solo imágenes JPG o PNG");
      return;
    }
    guardarImagenTemporal(f);
  });

  btnEnviar?.addEventListener("click", () => {
    const txt = metodoPago.value === "cash"
      ? "¿Confirmar pedido en efectivo?"
      : "¿Enviar comprobante y pedido?";
    confirmarEnvio(txt, enviarPedido);
  });

  await cargarResumen();
  renderCarrito();
  actualizarPago();
})();
