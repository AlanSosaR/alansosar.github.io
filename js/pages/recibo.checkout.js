/**
 * recibo.checkout.js
 * ---------------------------------------------------------
 * Crea y envía la orden de café.
 *
 * - Calcula el total del carrito
 * - Permite elegir método de pago
 * - Sube comprobante si es transferencia
 * - Inserta la orden y sus productos
 * - Redirige al recibo en modo solo lectura
 *
 * Solo se ejecuta cuando NO existe un id en la URL.
 */
console.log("🧾 recibo.checkout.js");

/* =========================================================
   ELEMENTOS UI — CHECKOUT
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
   CARRITO
========================================================= */
const lista = $id("listaProductos");
const carrito = JSON.parse(localStorage.getItem(CART_KEY)) || [];
let total = 0;

if (lista) {
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
  if (totalEl) totalEl.textContent = total.toFixed(2);
}

/* =========================================================
   MÉTODO DE PAGO — CONTROL UI
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

metodoPago?.addEventListener("change", () => {
  resetMetodoPago();

  if (metodoPago.value === "bank_transfer") {
    bloqueDeposito?.classList.remove("hidden");
    return;
  }

  if (
    metodoPago.value === "cash_on_delivery" ||
    metodoPago.value === "cash"
  ) {
    metodoPago.value = "cash_on_delivery";
    bloqueEfectivo?.classList.remove("hidden");
    btnEnviar.disabled = false;
    return;
  }

  console.warn("Método de pago no reconocido:", metodoPago.value);
});

/* =========================================================
   SUBIR COMPROBANTE — PREVIEW
========================================================= */
btnSubirComprobante?.addEventListener("click", (e) => {
  e.preventDefault();
  inputFile?.click();
});

inputFile?.addEventListener("change", () => {
  if (!inputFile.files.length) {
    btnEnviar.disabled = true;
    return;
  }

  const file = inputFile.files[0];

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

/* =========================================================
   ENVIAR PEDIDO
========================================================= */
async function enviarPedido() {
  const sb = window.supabaseClient;
  const user = getUserCache();

  if (!user || !selectedAddressId) {
    showSnack("Faltan datos del cliente");
    return;
  }

  if (metodoPago.value === "bank_transfer" && !inputFile.files.length) {
    showSnack("Debes subir el comprobante de pago");
    return;
  }

  btnEnviar.disabled = true;
  loader?.classList.remove("hidden");

  try {
    const { data: orderNumber } = await sb.rpc("next_order_number", {
      p_user_id: user.id
    });

    const { data: order } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        address_id: selectedAddressId,
        order_number: orderNumber,
        total,
        payment_method:
          metodoPago.value === "bank_transfer"
            ? "bank_transfer"
            : "cash_on_delivery",
        status: "pending",
        payment_status:
          metodoPago.value === "bank_transfer"
            ? "review"
            : "not_required"
      })
      .select("id")
      .single();

    await sb.from("order_items").insert(
      carrito.map(it => ({
        order_id: order.id,
        product_id: it.product_id,
        quantity: Number(it.qty),
        price: it.price
      }))
    );

    if (metodoPago.value === "bank_transfer") {
      const file = inputFile.files[0];
      const ext = file.name.split(".").pop().toLowerCase();
      const path = `${user.id}/${order.id}.${ext}`;

      await sb.storage
        .from(RECEIPT_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

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

    localStorage.setItem(CART_KEY, "[]");
    location.href = `recibo.html?id=${order.id}`;

  } catch (err) {
    console.error(err);
    showSnack("Error al enviar el pedido");
    btnEnviar.disabled = false;
  } finally {
    loader?.classList.add("hidden");
  }
}

/* =========================================================
   CONFIRMACIÓN
========================================================= */
btnEnviar?.addEventListener("click", (e) => {
  e.preventDefault();

  showSnack(
    "¿Confirmas enviar el pedido?",
    enviarPedido,
    "Corregir",
    () => (btnEnviar.disabled = false)
  );
});

/* =========================================================
   INIT CHECKOUT (PROTEGIDO)
========================================================= */
(async function initCheckout() {
  await esperarSupabase();

  if (IS_READ_ONLY) {
    console.log("🔒 recibo.checkout.js desactivado (modo vista)");
    return;
  }

  await setNumeroPedidoProvisional();
  await cargarDatosCliente();
  resetMetodoPago();
})();
