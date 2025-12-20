console.log("🧾 recibo.js — CORE FINAL");
// 🔐 Página protegida
window.PAGE_PROTECTED = true;

/* =========================================================
   HELPERS
========================================================= */
const $id = (id) => document.getElementById(id);

/* =========================================================
   SNACKBAR
========================================================= */
function showSnack(message) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `<span>${message}</span>`;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 3200);
}

/* =========================================================
   ESPERAR SUPABASE
========================================================= */
function esperarSupabase() {
  return new Promise(resolve => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve();
      }
    }, 80);
  });
}

/* =========================================================
   USUARIO EN CACHE
========================================================= */
function getUserCache() {
  try {
    if (localStorage.getItem("cortero_logged") !== "1") return null;
    return JSON.parse(localStorage.getItem("cortero_user"));
  } catch {
    return null;
  }
}

/* =========================================================
   NÚMERO DE PEDIDO
========================================================= */
async function obtenerSiguienteNumeroPedido(userId) {
  const sb = window.supabaseClient;

  const { data } = await sb
    .from("orders")
    .select("order_number")
    .eq("user_id", userId)
    .not("order_number", "is", null)
    .order("order_number", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return 1;
  return data[0].order_number + 1;
}

/* =========================================================
   FECHA
========================================================= */
const fechaEl = $id("fechaPedido");
if (fechaEl) {
  fechaEl.textContent = new Date().toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "medium",
    hour12: true
  });
}

/* =========================================================
   DATOS DEL CLIENTE
========================================================= */
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
    $id("nombreCliente").textContent   = userRow.name || "";
    $id("correoCliente").textContent   = userRow.email || "";
    $id("telefonoCliente").textContent = userRow.phone || "";
  }

  const { data: addr } = await sb
    .from("addresses")
    .select("state,street,postal_code")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    $id("zonaCliente").textContent      = addr[0].state || "";
    $id("direccionCliente").textContent = addr[0].street || "";
    $id("notaCliente").textContent      = addr[0].postal_code || "";
  }
}

/* =========================================================
   CARRITO
========================================================= */
const carrito = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
const lista = $id("listaProductos");
let total = 0;

if (lista) {
  lista.innerHTML = "";

  carrito.forEach(item => {
    const price = parseFloat(
      item.price.toString().replace(/[^\d.-]/g, "")
    ) || 0;

    const subtotal = price * item.qty;
    total += subtotal;

    lista.innerHTML += `
      <div class="cafe-item">
        <span class="cafe-nombre">
          ${item.name} (${item.qty} bolsas)
        </span>
        <span class="cafe-precio">
          L ${subtotal.toFixed(2)}
        </span>
      </div>
    `;
  });

  $id("totalPedido").textContent = total.toFixed(2);
}

/* =========================================================
   MÉTODO DE PAGO
========================================================= */
const metodoPago = $id("metodoPago");
const bloqueDeposito = $id("pago-deposito");
const bloqueEfectivo = $id("pago-efectivo");
const btnEnviar = $id("btnEnviar");
const loader = $id("loaderEnviar");
const inputFile = $id("inputComprobante");
const previewBox = $id("previewComprobante");
const imgPreview = $id("imgComprobante");

let comprobante = null;

function resetMetodoPago() {
  bloqueDeposito?.classList.add("hidden");
  bloqueEfectivo?.classList.add("hidden");
  previewBox?.classList.add("hidden");
  comprobante = null;
  if (btnEnviar) btnEnviar.disabled = true;
}

metodoPago?.addEventListener("change", () => {
  resetMetodoPago();

  if (metodoPago.value === "bank_transfer") {
    bloqueDeposito.classList.remove("hidden");
  }

  if (metodoPago.value === "cash") {
    bloqueEfectivo.classList.remove("hidden");
    btnEnviar.disabled = false;
  }
});

$id("btnSubirComprobante")?.addEventListener("click", () => {
  inputFile?.click();
});

inputFile?.addEventListener("change", () => {
  const file = inputFile.files[0];
  if (!file || !file.type.startsWith("image/")) return;

  comprobante = file;
  imgPreview.src = URL.createObjectURL(file);
  previewBox.classList.remove("hidden");
  btnEnviar.disabled = false;
});

/* =========================================================
   ENVIAR PEDIDO
========================================================= */
btnEnviar?.addEventListener("click", async () => {
  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  try {
    const orderNumber = await obtenerSiguienteNumeroPedido(user.id);

    const isCash = metodoPago.value === "cash";
    const isBank = metodoPago.value === "bank_transfer";

    if (isBank && !comprobante) {
      throw new Error("No hay comprobante");
    }

    const status = isCash
      ? "cash_on_delivery"
      : "payment_review";

    const { data: order, error } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        total,
        payment_method: metodoPago.value,
        status,
        order_number: orderNumber
      })
      .select()
      .single();

    if (error) throw error;

    if (isBank) {
      const ext = comprobante.name.split(".").pop();
      const path = `order_${order.id}/${Date.now()}.${ext}`;

      await sb.storage
        .from("payment-receipts")
        .upload(path, comprobante);

      const { data: urlData } =
        sb.storage.from("payment-receipts")
          .getPublicUrl(path);

      await sb.from("payment_receipts").insert({
        order_id: order.id,
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_path: path
      });
    }

    localStorage.removeItem("cafecortero_cart");

    const mensaje = isCash
      ? `Pedido N.º ${orderNumber} enviado. Pago en efectivo al entregar.`
      : `Pedido N.º ${orderNumber} enviado. Pago en revisión.`;

    showSnack(mensaje);

    setTimeout(() => {
      window.location.href = "mis-pedidos.html";
    }, 1600);

  } catch (err) {
    console.error("❌ Error pedido:", err);
    showSnack("No se pudo enviar el pedido");
    btnEnviar.disabled = false;
    loader.classList.add("hidden");
  }
});

/* =========================================================
   INIT
========================================================= */
(async function init() {
  await esperarSupabase();

  const user = getUserCache();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await cargarDatosCliente();
  resetMetodoPago();

  const numeroPedido =
    await obtenerSiguienteNumeroPedido(user.id);

  $id("numeroPedido").textContent = numeroPedido;
})();
