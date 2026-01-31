/**
 * 🧾 recibo.checkout.js — FINAL MATERIAL 3
 * ---------------------------------------------------------
 * Gestión de creación de pedidos y lógica de pago.
 */
console.log("🧾 recibo.checkout.js — Sincronizado");

/* =========================================================
   ELEMENTOS UI — CHECKOUT
========================================================= */
const metodoPago = $id("metodoPago");
const bloqueDeposito = $id("pago-deposito");
const bloqueEfectivo = $id("pago-efectivo");
const btnEnviar = $id("btnAccionPrincipal"); // ID corregido según tu HTML
const loader = $id("loaderAccion");

const inputFile = $id("inputComprobante");
const previewBox = $id("previewComprobante");
const imgPreview = $id("imgComprobante");
const btnSubirComprobante = $id("btnSubirComprobante");

// Variables de estado local
let selectedAddressId = null;
let totalPedidoGlobal = 0;
const carritoCheckout = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];

/* =========================================================
   SNACKBAR DE CONFIRMACIÓN (DISEÑO M3 EXPRESSIVE)
========================================================= */
function showConfirmSnack(message, onConfirm) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <div class="snack-content" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
      <span class="snack-text">${message}</span>
      <div class="snack-actions" style="display:flex; gap:8px;">
        <button class="snack-action secondary" id="snack-cancel">Editar</button>
        <button class="snack-action primary" id="snack-ok">Enviar</button>
      </div>
    </div>
  `;

  bar.classList.add("show");

  $id("snack-cancel").onclick = () => bar.classList.remove("show");
  
  $id("snack-ok").onclick = () => {
    bar.classList.remove("show");
    onConfirm();
  };
}

/* =========================================================
   CARGAR DATOS INICIALES
========================================================= */
async function cargarDatosCliente() {
  const sb = window.supabaseClient;
  const user = window.getUserCache();
  if (!user) return;

  // 1. Datos de usuario básicos
  const { data: userRow } = await sb.from("users")
    .select("name,email,phone")
    .eq("id", user.id)
    .single();

  if (userRow) {
    if($id("nombreCliente")) $id("nombreCliente").textContent = userRow.name || "—";
    if($id("correoCliente")) $id("correoCliente").textContent = userRow.email || "—";
    if($id("telefonoCliente")) $id("telefonoCliente").textContent = userRow.phone || "—";
  }

  // 2. Dirección (Zona y Detalle)
  const { data: addr } = await sb.from("addresses")
    .select("id,state,city,street")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    selectedAddressId = addr[0].id;
    // Llenar Zona (Estado + Ciudad) y Dirección en el HTML
    if($id("zonaCliente")) $id("zonaCliente").textContent = `${addr[0].state}, ${addr[0].city}`;
    if($id("direccionCliente")) $id("direccionCliente").textContent = addr[0].street;
    
    // Nota de pedido (Persistida desde datos_cliente.html)
    const notaActual = sessionStorage.getItem("current_order_notes");
    if($id("notaCliente")) $id("notaCliente").textContent = notaActual || "Sin nota adicional";
  }
}

async function prepararResumenCarrito() {
  const lista = $id("listaProductos");
  if (!lista || window.IS_READ_ONLY) return;

  lista.innerHTML = "";
  totalPedidoGlobal = 0;

  if (carritoCheckout.length === 0) {
    lista.innerHTML = "<p class='empty-msg'>Tu carrito está vacío</p>";
    return;
  }

  carritoCheckout.forEach(it => {
    const subtotal = it.qty * it.price;
    totalPedidoGlobal += subtotal;
    lista.innerHTML += `
      <div class="cafe-item">
        <div class="cafe-info-main">
          <span class="cafe-nombre">${it.name} <span class="cafe-qty">(${it.qty})</span></span>
        </div>
        <span class="cafe-precio">L ${subtotal.toFixed(2)}</span>
      </div>`;
  });

  if($id("totalPedido")) $id("totalPedido").textContent = totalPedidoGlobal.toFixed(2);
}

/* =========================================================
   LÓGICA DE MÉTODOS DE PAGO
========================================================= */
function resetMetodoPago() {
  bloqueDeposito?.classList.add("hidden");
  bloqueEfectivo?.classList.add("hidden");
  previewBox?.classList.add("hidden");
  if(btnEnviar) btnEnviar.disabled = true;
  if (inputFile) inputFile.value = "";
}

metodoPago?.addEventListener("change", () => {
  resetMetodoPago();
  const valor = metodoPago.value;

  if (valor === "bank_transfer") {
    bloqueDeposito?.classList.remove("hidden");
    // Habilitar solo cuando suba comprobante
  } else if (valor === "cash") {
    bloqueEfectivo?.classList.remove("hidden");
    if(btnEnviar) btnEnviar.disabled = false;
  }
});

/* =========================================================
   GESTIÓN DE COMPROBANTE
========================================================= */
btnSubirComprobante?.addEventListener("click", e => {
  e.preventDefault();
  inputFile?.click();
});

inputFile?.addEventListener("change", () => {
  const file = inputFile.files[0];
  if (!file || !file.type.startsWith("image/")) {
    window.showSnack("Solo se permiten imágenes (JPG, PNG)");
    return;
  }
  imgPreview.src = URL.createObjectURL(file);
  previewBox?.classList.remove("hidden");
  if(btnEnviar) btnEnviar.disabled = false; 
});

/* =========================================================
   PROCESO DE ENVÍO FINAL
========================================================= */
async function ejecutarEnvioPedido() {
  const sb = window.supabaseClient;
  const user = window.getUserCache();
  const notes = sessionStorage.getItem("current_order_notes") || "";

  if (!user || !selectedAddressId) {
    window.showSnack("Error: Faltan datos de entrega.");
    return;
  }

  btnEnviar.disabled = true;
  loader?.classList.remove("hidden");

  try {
    // 1. Obtener número de orden secuencial
    const { data: orderNumber } = await sb.rpc("next_order_number", { p_user_id: user.id });

    // 2. Crear Orden
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

    // 3. Insertar Items del Carrito
    const itemsToInsert = carritoCheckout.map(it => ({
      order_id: newOrder.id,
      product_id: it.product_id,
      quantity: it.qty,
      price: it.price
    }));

    const { error: itemsErr } = await sb.from("order_items").insert(itemsToInsert);
    if (itemsErr) throw itemsErr;

    // 4. Subir Imagen si es Transferencia
    if (metodoPago.value === "bank_transfer" && inputFile.files[0]) {
      const file = inputFile.files[0];
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${newOrder.id}_${Date.now()}.${ext}`;

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

    // 5. Finalizar y redirigir
    localStorage.setItem("cafecortero_cart", "[]");
    sessionStorage.removeItem("current_order_notes");
    window.location.href = `recibo.html?id=${newOrder.id}`;

  } catch (err) {
    console.error("Error Checkout:", err);
    window.showSnack("No pudimos procesar tu pedido. Intenta de nuevo.");
    btnEnviar.disabled = false;
  } finally {
    loader?.classList.add("hidden");
  }
}

/* =========================================================
   NAVEGACIÓN Y EVENTOS
========================================================= */
function configurarBotones() {
  const btnBack = $id("btn-back");
  if (btnBack) {
    btnBack.onclick = (e) => {
      e.preventDefault();
      // Durante el checkout, volver lleva a los datos de entrega
      window.location.href = "datos_cliente.html"; 
    };
  }

  btnEnviar?.addEventListener("click", e => {
    e.preventDefault();
    showConfirmSnack("¿Confirmas el envío de tu pedido?", ejecutarEnvioPedido);
  });
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */
(async function init() {
  await window.esperarSupabase();
  if (window.IS_READ_ONLY) return; 

  configurarBotones();
  await cargarDatosCliente();
  await prepararResumenCarrito();
  resetMetodoPago();
})();
