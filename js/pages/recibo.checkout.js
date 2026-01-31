/**
 * 🧾 recibo.checkout.js — FINAL MATERIAL 3 (CORREGIDO)
 * ---------------------------------------------------------
 * Gestión de creación de pedidos y persistencia de comprobante.
 */
console.log("🧾 recibo.checkout.js — Sincronizado");

/* =========================================================
   ELEMENTOS UI — CHECKOUT
========================================================= */
const metodoPago = $id("metodoPago");
const bloqueDeposito = $id("pago-deposito");
const bloqueEfectivo = $id("pago-efectivo");
const btnEnviar = $id("btnAccionPrincipal");
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
   PERSISTENCIA DE IMAGEN (PREVENT DATA LOSS ON RELOAD)
========================================================= */
// Función para guardar la imagen en sesión y que no se borre al recargar
function guardarImagenTemporal(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    sessionStorage.setItem("temp_receipt_base64", e.target.result);
    mostrarPreview(e.target.result);
  };
  reader.readAsDataURL(file);
}

function mostrarPreview(src) {
  if (!imgPreview || !previewBox) return;
  imgPreview.src = src;
  imgPreview.style.maxWidth = "100%";
  imgPreview.style.borderRadius = "12px";
  imgPreview.style.display = "block";
  previewBox.classList.remove("hidden");
  if (btnEnviar) btnEnviar.disabled = false;
}

/* =========================================================
   SNACKBAR DE CONFIRMACIÓN (DISEÑO M3 EXPRESSIVE)
========================================================= */
function showConfirmSnack(message, onConfirm) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <div class="snack-content" style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:12px;">
      <span class="snack-text" style="font-size:0.9rem;">${message}</span>
      <div class="snack-actions" style="display:flex; gap:8px;">
        <button class="snack-action secondary" id="snack-cancel" style="background:transparent; color:#fff; border:none; cursor:pointer; font-size:0.85rem;">Editar</button>
        <button class="snack-action primary" id="snack-ok" style="background:#fff; color:var(--md-sys-color-primary, #2e7d32); border:none; padding:6px 14px; border-radius:100px; cursor:pointer; font-weight:600; font-size:0.85rem;">Confirmar</button>
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
async function cargarDatosResumen() {
  const sb = window.supabaseClient;
  const user = window.getUserCache();
  if (!user) return;

  const ahora = new Date();
  if($id("fechaPedido")) $id("fechaPedido").textContent = ahora.toLocaleDateString();
  if($id("horaPedido")) $id("horaPedido").textContent = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const { data: userRow } = await sb.from("users")
    .select("name,email,phone")
    .eq("id", user.id)
    .single();

  if (userRow) {
    if($id("nombreCliente")) $id("nombreCliente").textContent = userRow.name || "—";
    if($id("correoCliente")) $id("correoCliente").textContent = userRow.email || "—";
    if($id("telefonoCliente")) $id("telefonoCliente").textContent = userRow.phone || "—";
  }

  const { data: addr } = await sb.from("addresses")
    .select("id,state,city,street")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    selectedAddressId = addr[0].id;
    if($id("zonaCliente")) $id("zonaCliente").textContent = `${addr[0].state}, ${addr[0].city}`;
    if($id("direccionCliente")) $id("direccionCliente").textContent = addr[0].street;
    
    const notaActual = sessionStorage.getItem("current_order_notes");
    if($id("notaCliente")) $id("notaCliente").textContent = notaActual || "Sin nota adicional";
  }
}

async function prepararResumenCarrito() {
  const lista = $id("listaProductos");
  if (!lista) return;

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
      <div class="cafe-item" style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span class="cafe-nombre">${it.name} <b style="opacity:0.7">x${it.qty}</b></span>
        <span class="cafe-precio">L ${subtotal.toFixed(2)}</span>
      </div>`;
  });

  if($id("totalPedido")) $id("totalPedido").textContent = totalPedidoGlobal.toFixed(2);
}

/* =========================================================
   LÓGICA DE MÉTODOS DE PAGO
========================================================= */
function actualizarInterfazPago() {
  const valor = metodoPago.value;
  bloqueDeposito?.classList.add("hidden");
  bloqueEfectivo?.classList.add("hidden");

  if (valor === "bank_transfer") {
    bloqueDeposito?.classList.remove("hidden");
    // Si ya había una imagen cargada en sesión, mostrarla
    const storedImg = sessionStorage.getItem("temp_receipt_base64");
    btnEnviar.disabled = !storedImg;
    if(storedImg) mostrarPreview(storedImg);
  } else if (valor === "cash") {
    bloqueEfectivo?.classList.remove("hidden");
    btnEnviar.disabled = false;
  } else {
    btnEnviar.disabled = true;
  }
}

metodoPago?.addEventListener("change", actualizarInterfazPago);

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
  guardarImagenTemporal(file);
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
    // 1. Obtener número de orden secuencial real
    const { data: orderNumber, error: rpcErr } = await sb.rpc("next_order_number");
    if (rpcErr) console.warn("Error RPC correlativo, usando fallback");

    const finalNumber = orderNumber || Math.floor(1000 + Math.random() * 9000);

    // 2. Crear Orden
    const { data: newOrder, error: orderErr } = await sb.from("orders").insert({
      user_id: user.id,
      address_id: selectedAddressId,
      order_number: finalNumber,
      total: totalPedidoGlobal,
      payment_method: metodoPago.value,
      status: "pending",
      order_notes: notes
    }).select("id, order_number").single();

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

    // 4. Subir Imagen (desde el input o desde el base64 de sesión)
    if (metodoPago.value === "bank_transfer") {
      const storedBase64 = sessionStorage.getItem("temp_receipt_base64");
      if (storedBase64) {
        // Convertir base64 a Blob para subir a Storage
        const res = await fetch(storedBase64);
        const blob = await res.blob();
        const path = `${user.id}/${newOrder.id}_${Date.now()}.png`;

        const { error: uploadErr } = await sb.storage.from("payment-receipts").upload(path, blob);
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
    }

    // 5. Limpieza y Redirección
    localStorage.setItem("cafecortero_cart", "[]");
    sessionStorage.removeItem("current_order_notes");
    sessionStorage.removeItem("temp_receipt_base64");
    
    window.location.href = `recibo.html?id=${newOrder.id}`;

  } catch (err) {
    console.error("Error Checkout:", err);
    window.showSnack("Error al procesar pedido. Revisa tu conexión.");
    btnEnviar.disabled = false;
  } finally {
    loader?.classList.add("hidden");
  }
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */
(async function init() {
  await window.esperarSupabase();
  
  // Configuración de botones
  $id("btn-back")?.addEventListener("click", () => window.location.href = "datos_cliente.html");
  btnEnviar?.addEventListener("click", e => {
    const txt = (metodoPago.value === "cash") ? "¿Confirmas tu pedido con pago en efectivo?" : "¿Confirmas el envío de tu comprobante y pedido?";
    showConfirmSnack(txt, ejecutarEnvioPedido);
  });

  await cargarDatosResumen();
  await prepararResumenCarrito();
  
  // Restaurar estado si hubo reload
  actualizarInterfazPago();
})();
