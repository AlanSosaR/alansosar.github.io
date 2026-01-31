/**
 * recibo.checkout.js — FINAL DEFINITIVO CORREGIDO
 * ---------------------------------------------------------
 * Checkout de pedidos Café Cortero con soporte order_notes
 * Versión optimizada para flujo de Efectivo y Transferencia
 */
console.log("🧾 recibo.checkout.js — Sincronizado");

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
   SNACKBAR DE CONFIRMACIÓN
========================================================= */
function showConfirmSnack(message, onConfirm, onCancel) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <span class="snack-text">${message}</span>
    <div class="snack-actions">
      <button class="snack-action secondary">Editar</button>
      <button class="snack-action primary">Enviar</button>
    </div>
  `;

  bar.classList.add("show");

  bar.querySelector(".secondary")?.addEventListener("click", () => {
    bar.classList.remove("show");
    onCancel?.();
  });

  bar.querySelector(".primary")?.addEventListener("click", () => {
    bar.classList.remove("show");
    onConfirm?.();
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
    $id("nombreCliente").textContent = userRow.name || "—";
    $id("correoCliente").textContent = userRow.email || "—";
    $id("telefonoCliente").textContent = userRow.phone || "—";
  }

  const { data: addr } = await sb
    .from("addresses")
    .select("id,state,city,street")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    selectedAddressId = addr[0].id;
    $id("zonaCliente").textContent = `${addr[0].state}, ${addr[0].city}`;
    $id("direccionCliente").textContent = addr[0].street || "—";
    
    const notaActual = sessionStorage.getItem("current_order_notes");
    $id("notaCliente").textContent = notaActual || "Sin referencia";
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
  $id("fechaPedido").textContent = new Date().toLocaleDateString("es-ES");

  const horaEl = $id("horaPedido");
  if (horaEl) {
    horaEl.textContent = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

/* =========================================================
   CARRITO
========================================================= */
const lista = $id("listaProductos");
const carrito = JSON.parse(localStorage.getItem(CART_KEY)) || [];
let total = 0;

if (lista && !IS_READ_ONLY) {
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

/* =========================================================
   MÉTODO DE PAGO — UI (LOGICA CORREGIDA)
========================================================= */
function resetMetodoPago() {
  // Ocultamos ambos bloques antes de decidir cual mostrar
  bloqueDeposito?.classList.add("hidden");
  bloqueEfectivo?.classList.add("hidden");
  previewBox?.classList.add("hidden");
  
  if (imgPreview) imgPreview.src = "";
  btnSubirComprobante?.classList.remove("hidden");
  
  // Bloqueamos el botón hasta que se cumpla la condición del método
  btnEnviar.disabled = true; 
  if (inputFile) inputFile.value = "";
}

metodoPago?.addEventListener("change", () => {
  resetMetodoPago();

  const valor = metodoPago.value;

  if (valor === "bank_transfer") {
    bloqueDeposito?.classList.remove("hidden");
    // El botón permanece disabled hasta que inputFile detecte cambio
    console.log("Modo transferencia: esperando comprobante.");
  } 
  else if (valor === "cash_on_delivery") {
    // ✅ CORRECCIÓN: Mostramos el bloque de efectivo y habilitamos el envío
    bloqueEfectivo?.classList.remove("hidden");
    btnEnviar.disabled = false;
    console.log("Modo efectivo: información desplegada y botón habilitado.");
  }
});

/* =========================================================
   SUBIR COMPROBANTE
========================================================= */
btnSubirComprobante?.addEventListener("click", e => {
  e.preventDefault();
  inputFile?.click();
});

inputFile?.addEventListener("change", () => {
  const file = inputFile.files[0];
  if (!file || !file.type.startsWith("image/")) {
    showSnack("Solo se permiten imágenes");
    inputFile.value = "";
    btnEnviar.disabled = true;
    return;
  }

  imgPreview.src = URL.createObjectURL(file);
  previewBox?.classList.remove("hidden");
  
  // ✅ Habilitar botón tras subir imagen válida en transferencia
  btnEnviar.disabled = false;
});

/* =========================================================
   ENVIAR PEDIDO
========================================================= */
async function enviarPedido() {
  const sb = window.supabaseClient;
  const user = getUserCache();
  const orderNotes = sessionStorage.getItem("current_order_notes") || "";

  if (!user || !selectedAddressId) {
    showSnack("Faltan datos del cliente");
    return;
  }

  btnEnviar.disabled = true;
  if (loader) loader.classList.remove("hidden");

  try {
    const { data: orderNumber } = await sb.rpc("next_order_number", { p_user_id: user.id });

    // Insertar Orden Principal
    const { data: newOrder, error: orderErr } = await sb.from("orders").insert({
      user_id: user.id,
      address_id: selectedAddressId,
      order_number: orderNumber,
      total: parseFloat(total), 
      payment_method: metodoPago.value,
      status: "pending",
      order_notes: orderNotes 
    }).select("id").single();

    if (orderErr) throw orderErr;

    // Insertar Detalles del Carrito
    await sb.from("order_items").insert(
      carrito.map(it => ({
        order_id: newOrder.id,
        product_id: it.product_id,
        quantity: it.qty,
        price: it.price
      }))
    );

    // Lógica específica para transferencia (Subida de archivo)
    if (metodoPago.value === "bank_transfer") {
      const file = inputFile.files[0];
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${newOrder.id}_${Date.now()}.${ext}`;

      await sb.storage.from(RECEIPT_BUCKET).upload(path, file);
      const { data: urlData } = sb.storage.from(RECEIPT_BUCKET).getPublicUrl(path);

      await sb.from("payment_receipts").insert({
        order_id: newOrder.id,
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_path: path,
        review_status: "pending"
      });
    }

    // Finalización exitosa
    localStorage.setItem(CART_KEY, "[]");
    sessionStorage.removeItem("current_order_notes");
    
    // Redirección al recibo final
    location.href = `recibo.html?id=${newOrder.id}`;

  } catch (err) {
    console.error("Error en checkout:", err);
    showSnack("No se pudo completar el pedido");
    btnEnviar.disabled = false;
  } finally {
    if (loader) loader.classList.add("hidden");
  }
}

/* =========================================================
   MANEJO DE CONFIRMACIÓN
========================================================= */
btnEnviar?.addEventListener("click", e => {
  e.preventDefault();
  showConfirmSnack("¿Confirmas enviar el pedido?", enviarPedido, () => {
    // Si el usuario edita, el botón debe quedar activo si ya hay info válida
    const esEfectivo = metodoPago.value === "cash_on_delivery";
    const tieneFoto = metodoPago.value === "bank_transfer" && inputFile.files.length > 0;
    
    if (esEfectivo || tieneFoto) {
       btnEnviar.disabled = false;
    }
  });
});

/* =========================================================
   INIT
========================================================= */
(async function initCheckout() {
  await esperarSupabase();
  if (IS_READ_ONLY) return;
  await setNumeroPedidoProvisional();
  await cargarDatosCliente();
  resetMetodoPago();
})();
