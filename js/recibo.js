console.log("🧾 recibo.js — versión FINAL corregida");

/* =========================================================
   MODO DE PÁGINA
========================================================= */
window.PAGE_MODE = "recibo";

/* =========================================================
   HELPERS
========================================================= */
function safe(id) {
  return document.getElementById(id);
}

/* =========================================================
   SNACKBAR
========================================================= */
function showSnack(message) {
  const bar = safe("snackbar");
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
   CACHE USUARIO
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
   NÚMERO DE PEDIDO (FRONT)
========================================================= */
let numeroPedido = localStorage.getItem("numeroPedidoActivo");

if (!numeroPedido) {
  let consecutivo = parseInt(localStorage.getItem("ultimoPedido") || "0") + 1;
  localStorage.setItem("ultimoPedido", consecutivo);
  localStorage.setItem("numeroPedidoActivo", consecutivo);
  numeroPedido = consecutivo;
}

safe("numeroPedido").textContent = numeroPedido;
safe("fechaPedido").textContent = new Date().toLocaleString("es-HN", {
  dateStyle: "short",
  timeStyle: "medium",
  hour12: true
});

/* =========================================================
   DATOS DEL CLIENTE
========================================================= */
async function cargarDatosCliente() {
  const sb = window.supabaseClient;
  const user = getUserCache();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data: userRow } = await sb
    .from("users")
    .select("name,email,phone")
    .eq("id", user.id)
    .single();

  if (userRow) {
    safe("nombreCliente").textContent = userRow.name || "";
    safe("correoCliente").textContent = userRow.email || "";
    safe("telefonoCliente").textContent = userRow.phone || "";
  }

  const { data: addr } = await sb
    .from("addresses")
    .select("state,street,postal_code")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    safe("zonaCliente").textContent = addr[0].state || "";
    safe("direccionCliente").textContent = addr[0].street || "";
    safe("notaCliente").textContent = addr[0].postal_code || "";
  }
}

/* =========================================================
   CARRITO
========================================================= */
const carrito = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
const lista = safe("listaProductos");
let total = 0;

if (lista) {
  lista.innerHTML = "";
  carrito.forEach(item => {
    const price = parseFloat(item.price.toString().replace(/[^\d.-]/g, "")) || 0;
    const subtotal = price * item.qty;
    total += subtotal;

    lista.innerHTML += `
      <div class="cafe-item">
        <div>
          <span class="cafe-nombre">${item.name}</span>
          <span class="cafe-cantidad">x${item.qty}</span>
        </div>
        <span class="cafe-precio">L ${subtotal.toFixed(2)}</span>
      </div>
    `;
  });

  safe("totalPedido").textContent = total.toFixed(2);
}

/* =========================================================
   MÉTODO DE PAGO
========================================================= */
const metodoPagoSelect = safe("metodoPago");
const bloqueDeposito  = safe("pago-deposito");
const bloqueEfectivo  = safe("pago-efectivo");

const btnEnviar   = safe("btnEnviar");
const loader      = safe("loaderEnviar");
const inputFile   = safe("inputComprobante");
const previewBox  = safe("previewComprobante");
const imgPreview  = safe("imgComprobante");

let comprobante = null;

/* ================= ESTADO INICIAL ================= */
function resetMetodoPago() {
  bloqueDeposito.classList.add("hidden");
  bloqueEfectivo.classList.add("hidden");
  previewBox.classList.add("hidden");

  comprobante = null;
  btnEnviar.disabled = true;
}

/* ================= CAMBIO DE MÉTODO ================= */
function actualizarMetodoPago() {
  resetMetodoPago();

  const metodo = metodoPagoSelect.value;

  if (metodo === "bank_transfer") {
    bloqueDeposito.classList.remove("hidden");
    btnEnviar.disabled = true;
  }

  if (metodo === "cash") {
    bloqueEfectivo.classList.remove("hidden");
    btnEnviar.disabled = false;
  }
}

metodoPagoSelect.addEventListener("change", actualizarMetodoPago);

/* ================= SUBIR COMPROBANTE ================= */
safe("btnSubirComprobante")?.addEventListener("click", () => {
  inputFile.click();
});

inputFile?.addEventListener("change", () => {
  const file = inputFile.files[0];
  if (!file || !file.type.startsWith("image/")) return;

  comprobante = file;
  imgPreview.src = URL.createObjectURL(file);
  previewBox.classList.remove("hidden");

  if (metodoPagoSelect.value === "bank_transfer") {
    btnEnviar.disabled = false;
  }
});

/* =========================================================
   ENVIAR PEDIDO
========================================================= */
btnEnviar.addEventListener("click", async () => {
  const metodo = metodoPagoSelect.value;
  const sb = window.supabaseClient;
  const user = getUserCache();

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  try {
    const status =
      metodo === "cash"
        ? "cash_on_delivery"
        : "payment_review";

    const { data: order, error } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        total,
        payment_method: metodo,
        status
      })
      .select()
      .single();

    if (error) throw error;

    if (metodo === "bank_transfer") {
      const ext = comprobante.name.split(".").pop();
      const path = `order_${order.id}/${Date.now()}.${ext}`;

      await sb.storage.from("payment-receipts").upload(path, comprobante);
      const { data: urlData } =
        sb.storage.from("payment-receipts").getPublicUrl(path);

      await sb.from("payment_receipts").insert({
        order_id: order.id,
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_path: path
      });

      showSnack("Pedido enviado. Comprobante recibido y en revisión.");
    } else {
      showSnack("Pedido confirmado. Pago en efectivo al momento de la entrega.");
    }

    localStorage.removeItem("cafecortero_cart");
    localStorage.removeItem("numeroPedidoActivo");

    setTimeout(() => {
      window.location.href = "mis-pedidos.html";
    }, 1400);

  } catch (err) {
    console.error("❌ Error pedido:", err);
    showSnack("No se pudo enviar el pedido. Intenta nuevamente.");
    btnEnviar.disabled = false;
    loader.classList.add("hidden");
  }
});

/* =========================================================
   INIT
========================================================= */
(async function init() {
  await esperarSupabase();
  cargarDatosCliente();
  resetMetodoPago();
})();
