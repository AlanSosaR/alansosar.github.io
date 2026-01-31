/**
 * 🧾 recibo.checkout.js — FINAL MATERIAL 3
 * ---------------------------------------------------------
 * Gestión de creación de pedidos y lógica de pago.
 */
console.log("🧾 recibo.checkout.js — Sincronizado con Material 3 Expressive");

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

// Variables de estado local
let selectedAddressId = null;
let totalPedidoGlobal = 0;
const carritoCheckout = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];

/* =========================================================
   SNACKBAR DE CONFIRMACIÓN (DISEÑO M3)
========================================================= */
function showConfirmSnack(message, onConfirm, onCancel) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <div class="snack-content">
      <span class="snack-text">${message}</span>
      <div class="snack-actions">
        <button class="snack-btn-text" id="snack-cancel">Editar</button>
        <button class="snack-btn-filled" id="snack-ok">Enviar</button>
      </div>
    </div>
  `;

  bar.classList.add("show");

  $id("snack-cancel").onclick = () => {
    bar.classList.remove("show");
    if (onCancel) onCancel();
  };

  $id("snack-ok").onclick = () => {
    bar.classList.remove("show");
    if (onConfirm) onConfirm();
  };
}

/* =========================================================
   CARGAR DATOS INICIALES
========================================================= */
async function cargarDatosCliente() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  // 1. Datos de usuario
  const { data: userRow } = await sb.from("users").select("name,email,phone").eq("id", user.id).single();
  if (userRow) {
    $id("nombreCliente").textContent = userRow.name || "—";
    $id("correoCliente").textContent = userRow.email || "—";
    $id("telefonoCliente").textContent = userRow.phone || "—";
  }

  // 2. Dirección y Notas
  const { data: addr } = await sb.from("addresses").select("id,state,city,street").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);

  if (addr?.length) {
    selectedAddressId = addr[0].id;
    // M3 Expressive: Usamos el ID del contenedor de resumen
    const resumenDir = $id("direccion-resumen");
    if (resumenDir) resumenDir.textContent = `${addr[0].street}, ${addr[0].city}`;
    
    // Nota de pedido (sessionStorage es donde guardamos lo que el usuario escribió en carrito)
    const notaActual = sessionStorage.getItem("current_order_notes");
    $id("notaCliente").textContent = notaActual || "Sin referencia adicional";
  }
}

async function prepararResumenCarrito() {
  const lista = $id("listaProductos");
  if (!lista || IS_READ_ONLY) return;

  lista.innerHTML = "";
  totalPedidoGlobal = 0;

  carritoCheckout.forEach(it => {
    const subtotal = it.qty * it.price;
    totalPedidoGlobal += subtotal;
    lista.innerHTML += `
      <div class="cafe-item">
        <span class="item-info">${it.name} (x${it.qty})</span>
        <span class="item-subtotal">L ${subtotal.toFixed(2)}</span>
      </div>`;
  });

  $id("totalPedido").textContent = totalPedidoGlobal.toFixed(2);
}

/* =========================================================
   LÓGICA DE MÉTODOS DE PAGO
========================================================= */
function resetMetodoPago() {
  bloqueDeposito?.classList.add("hidden");
  bloqueEfectivo?.classList.add("hidden");
  previewBox?.classList.add("hidden");
  btnEnviar.disabled = true;
  if (inputFile) inputFile.value = "";
}

metodoPago?.addEventListener("change", () => {
  resetMetodoPago();
  const valor = metodoPago.value;

  if (valor === "bank_transfer") {
    bloqueDeposito?.classList.remove("hidden");
    // El botón se habilita solo cuando suba la imagen
  } else if (valor === "cash") {
    bloqueEfectivo?.classList.remove("hidden");
    btnEnviar.disabled = false;
  }
});

/* =========================================================
   GESTIÓN DE COMPROBANTE (STORAGE)
========================================================= */
btnSubirComprobante?.addEventListener("click", e => {
  e.preventDefault();
  inputFile?.click();
});

inputFile?.addEventListener("change", () => {
  const file = inputFile.files[0];
  if (!file || !file.type.startsWith("image/")) {
    showSnack("Solo se permiten imágenes (JPG, PNG)");
    return;
  }

  imgPreview.src = URL.createObjectURL(file);
  previewBox?.classList.remove("hidden");
  btnEnviar.disabled = false; // Habilitar tras cargar comprobante
});

/* =========================================================
   PROCESO DE ENVÍO FINAL
========================================================= */
async function ejecutarEnvioPedido() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  const notes = sessionStorage.getItem("current_order_notes") || "";

  if (!user || !selectedAddressId) {
    showSnack("Error: Faltan datos de entrega.");
    return;
  }

  btnEnviar.disabled = true;
  if (loader) loader.classList.remove("hidden");

  try {
    // 1. Obtener número de orden
    const { data: orderNumber } = await sb.rpc("next_order_number", { p_user_id: user.id });

    // 2. Insertar Orden
    const { data: newOrder, error: orderErr } = await sb.from("orders").insert({
      user_id: user.id,
      address_id: selectedAddressId,
      order_number: orderNumber,
      total: totalPedidoGlobal,
      payment_method: metodoPago.value,
      status: "pending",
      order_notes: notes
    }).select("id").single();

    if (orderErr) throw orderErr;

    // 3. Insertar Items
    const itemsToInsert = carritoCheckout.map(it => ({
      order_id: newOrder.id,
      product_id: it.product_id,
      quantity: it.qty,
      price: it.price
    }));

    const { error: itemsErr } = await sb.from("order_items").insert(itemsToInsert);
    if (itemsErr) throw itemsErr;

    // 4. Subir Comprobante (Si aplica)
    if (metodoPago.value === "bank_transfer") {
      const file = inputFile.files[0];
      const ext = file.name.split(".").pop();
      const fileName = `${newOrder.id}_${Date.now()}.${ext}`;
      const path = `${user.id}/${fileName}`;

      const { error: uploadErr } = await sb.storage.from("payment-receipts").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = sb.storage.from("payment-receipts").getPublicUrl(path);

      await sb.from("payment_receipts").insert({
        order_id: newOrder.id,
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_path: path,
        review_status: "pending"
      });
    }

    // 5. Limpieza
    localStorage.setItem("cafecortero_cart", "[]");
    sessionStorage.removeItem("current_order_notes");

    // Redirigir a la vista de recibo (Modo Lectura)
    window.location.href = `recibo.html?id=${newOrder.id}`;

  } catch (err) {
    console.error("Error Checkout:", err);
    showSnack("No pudimos procesar tu pedido. Intenta de nuevo.");
    btnEnviar.disabled = false;
  } finally {
    if (loader) loader.classList.add("hidden");
  }
}

/* =========================================================
   EVENTO PRINCIPAL
========================================================= */
btnEnviar?.addEventListener("click", e => {
  e.preventDefault();
  showConfirmSnack("¿Estás seguro de enviar tu pedido?", ejecutarEnvioPedido, () => {
    console.log("Envío cancelado por el usuario.");
  });
});

/* =========================================================
   INICIALIZACIÓN
========================================================= */
(async function init() {
  await esperarSupabase();
  if (IS_READ_ONLY) return; // Si hay ?id en URL, el core se encarga

  await cargarDatosCliente();
  await prepararResumenCarrito();
  resetMetodoPago();
})();
