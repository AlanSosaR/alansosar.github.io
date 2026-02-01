/**
 * 🧾 recibo.checkout.js — FINAL MATERIAL 3 EXPRESSIVE (CORREGIDO)
 * ---------------------------------------------------------
 * Gestión de creación de pedidos, persistencia y notificaciones.
 */
console.log("🧾 recibo.checkout.js — OK");

/* =========================================================
   HELPERS
========================================================= */
const $id = (id) => document.getElementById(id);

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

/* =========================================================
   STATE
========================================================= */
let selectedAddressId = null;
let totalPedidoGlobal = 0;
const carritoCheckout =
  JSON.parse(localStorage.getItem("cafecortero_cart")) || [];

/* =========================================================
   PERSISTENCIA DE IMAGEN
========================================================= */
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
  btnEnviar.disabled = false;
}

/* =========================================================
   SNACKBAR CONFIRMACIÓN
========================================================= */
function showConfirmSnack(message, onConfirm) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <div class="snack-content" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <span>${message}</span>
      <div style="display:flex;gap:8px;">
        <button id="snack-cancel" class="snack-action secondary">Editar</button>
        <button id="snack-ok" class="snack-action primary">Confirmar</button>
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
   CARGA DE DATOS
========================================================= */
async function cargarDatosResumen() {
  const sb = window.supabaseClient;
  const user = window.getUserCache();
  if (!user) return;

  const ahora = new Date();
  $id("fechaPedido") &&
    ($id("fechaPedido").textContent = ahora.toLocaleDateString());
  $id("horaPedido") &&
    ($id("horaPedido").textContent = ahora.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }));

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
    $id("direccionCliente").textContent = addr[0].street;

    const nota = sessionStorage.getItem("current_order_notes");
    $id("notaCliente").textContent = nota || "Sin nota adicional";
  }
}

async function prepararResumenCarrito() {
  const lista = $id("listaProductos");
  if (!lista) return;

  lista.innerHTML = "";
  totalPedidoGlobal = 0;

  if (!carritoCheckout.length) {
    lista.innerHTML = "<p class='empty-msg'>Tu carrito está vacío</p>";
    return;
  }

  carritoCheckout.forEach((it) => {
    const subtotal = it.qty * it.price;
    totalPedidoGlobal += subtotal;
    lista.innerHTML += `
      <div class="cafe-item" style="display:flex;justify-content:space-between;">
        <span>${it.name} <b>x${it.qty}</b></span>
        <span>L ${subtotal.toFixed(2)}</span>
      </div>`;
  });

  $id("totalPedido").textContent = totalPedidoGlobal.toFixed(2);
}

/* =========================================================
   MÉTODOS DE PAGO
========================================================= */
function actualizarInterfazPago() {
  const valor = metodoPago.value;

  bloqueDeposito.classList.toggle("hidden", valor !== "bank_transfer");
  bloqueEfectivo.classList.toggle("hidden", valor !== "cash");

  if (valor === "bank_transfer") {
    const img = sessionStorage.getItem("temp_receipt_base64");
    btnEnviar.disabled = !img;
    if (img) mostrarPreview(img);
  } else {
    btnEnviar.disabled = false;
  }
}

metodoPago.addEventListener("change", actualizarInterfazPago);

/* =========================================================
   COMPROBANTE
========================================================= */
btnSubirComprobante.addEventListener("click", (e) => {
  e.preventDefault();
  inputFile.click();
});

inputFile.addEventListener("change", () => {
  const file = inputFile.files[0];
  if (!file || !file.type.startsWith("image/")) {
    window.showSnack("Solo imágenes JPG o PNG");
    return;
  }
  guardarImagenTemporal(file);
});

/* =========================================================
   ENVÍO FINAL (CORE)
========================================================= */
async function ejecutarEnvioPedido() {
  const sb = window.supabaseClient;
  const user = window.getUserCache();
  const notes = sessionStorage.getItem("current_order_notes") || "";

  if (!user || !selectedAddressId) {
    window.showSnack("Faltan datos del pedido");
    return;
  }

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  try {
    // 1️⃣ CREAR ORDEN (LA BD ASIGNA order_number)
    const { data: order, error } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        address_id: selectedAddressId,
        total: totalPedidoGlobal,
        payment_method: metodoPago.value,
        status: "pending",
        order_notes: notes,
      })
      .select("id, order_number")
      .single();

    if (error) throw error;

    const orderId = order.id;
    const orderNumber = order.order_number;

    // 2️⃣ ITEMS
    await sb.from("order_items").insert(
      carritoCheckout.map((it) => ({
        order_id: orderId,
        product_id: it.product_id,
        quantity: it.qty,
        price: it.price,
      }))
    );

    // 3️⃣ COMPROBANTE
    if (metodoPago.value === "bank_transfer") {
      const base64 = sessionStorage.getItem("temp_receipt_base64");
      if (base64) {
        const blob = await (await fetch(base64)).blob();
        const path = `${user.id}/${orderId}_${Date.now()}.png`;

        await sb.storage.from("payment-receipts").upload(path, blob);
        const { data } = sb.storage
          .from("payment-receipts")
          .getPublicUrl(path);

        await sb.from("payment_receipts").insert({
          order_id: orderId,
          user_id: user.id,
          file_url: data.publicUrl,
          file_path: path,
        });
      }
    }

    // 4️⃣ NOTIFICACIÓN
    await sb.functions.invoke("notify-new-order", {
      body: { orderId, number: orderNumber },
    });

    // 5️⃣ LIMPIEZA
    localStorage.setItem("cafecortero_cart", "[]");
    sessionStorage.removeItem("temp_receipt_base64");

    window.location.href = `recibo.html?id=${orderId}`;
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

  $id("btn-back")?.addEventListener(
    "click",
    () => (window.location.href = "datos_cliente.html")
  );

  btnEnviar.addEventListener("click", () => {
    const txt =
      metodoPago.value === "cash"
        ? "¿Confirmar pedido en efectivo?"
        : "¿Enviar comprobante y pedido?";
    showConfirmSnack(txt, ejecutarEnvioPedido);
  });

  await cargarDatosResumen();
  await prepararResumenCarrito();
  actualizarInterfazPago();
})();
