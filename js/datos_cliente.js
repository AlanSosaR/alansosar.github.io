console.log("🧾 recibo.js — FINAL BD + VALIDACIONES");

/* =========================================================
   HELPERS
========================================================= */
function $(id) {
  return document.getElementById(id);
}

/* =========================================================
   SNACKBAR
========================================================= */
function showSnack(msg) {
  const bar = $("snackbar");
  if (!bar) return;

  bar.innerHTML = `<span>${msg}</span>`;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 3200);
}

/* =========================================================
   ESPERAR SUPABASE
========================================================= */
function esperarSupabase() {
  return new Promise(resolve => {
    if (window.supabaseClient) resolve();
    else {
      const i = setInterval(() => {
        if (window.supabaseClient) {
          clearInterval(i);
          resolve();
        }
      }, 80);
    }
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
   MATERIAL 3 — ERRORES
========================================================= */
function mostrarError(input, mensaje) {
  const field = input.closest(".pago-select-label, .pago-bloque");
  if (!field) return;

  let helper = field.querySelector(".helper-text");
  if (!helper) {
    helper = document.createElement("div");
    helper.className = "helper-text";
    field.appendChild(helper);
  }

  field.classList.add("error");
  helper.textContent = mensaje;
}

function limpiarError(input) {
  const field = input.closest(".pago-select-label, .pago-bloque");
  if (!field) return;

  field.classList.remove("error");
  const helper = field.querySelector(".helper-text");
  if (helper) helper.textContent = "";
}

/* =========================================================
   FECHA
========================================================= */
$("fechaPedido").textContent = new Date().toLocaleString("es-HN", {
  dateStyle: "short",
  timeStyle: "medium",
  hour12: true
});

/* =========================================================
   DATOS CLIENTE
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
    $("nombreCliente").textContent = userRow.name || "";
    $("correoCliente").textContent = userRow.email || "";
    $("telefonoCliente").textContent = userRow.phone || "";
  }

  const { data: addr } = await sb
    .from("addresses")
    .select("state,street,postal_code")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    $("zonaCliente").textContent      = addr[0].state || "";
    $("direccionCliente").textContent = addr[0].street || "";
    $("notaCliente").textContent      = addr[0].postal_code || "";
  }
}

/* =========================================================
   CARRITO
========================================================= */
const carrito = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
const lista = $("listaProductos");
let total = 0;

lista.innerHTML = "";

carrito.forEach(item => {
  const price = parseFloat(item.price) || 0;
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

$("totalPedido").textContent = total.toFixed(2);

/* =========================================================
   MÉTODO DE PAGO
========================================================= */
const metodoPago   = $("metodoPago");
const pagoDeposito = $("pago-deposito");
const pagoEfectivo = $("pago-efectivo");

const btnEnviar  = $("btnEnviar");
const loader     = $("loaderEnviar");

const btnSubir   = $("btnSubirComprobante");
const inputFile  = $("inputComprobante");
const previewBox = $("previewComprobante");
const imgPrev    = $("imgComprobante");

let comprobante = null;

/* ================= RESET ================= */
function resetPago() {
  pagoDeposito.classList.add("hidden");
  pagoEfectivo.classList.add("hidden");
  previewBox.classList.add("hidden");
  comprobante = null;
  btnEnviar.disabled = true;
}

resetPago();

/* ================= CAMBIO MÉTODO ================= */
metodoPago.addEventListener("change", () => {
  resetPago();
  limpiarError(metodoPago);

  if (metodoPago.value === "bank_transfer") {
    pagoDeposito.classList.remove("hidden");
  }

  if (metodoPago.value === "cash") {
    pagoEfectivo.classList.remove("hidden");
    btnEnviar.disabled = false;
  }
});

/* ================= SUBIR COMPROBANTE ================= */
btnSubir?.addEventListener("click", () => inputFile.click());

inputFile?.addEventListener("change", () => {
  const file = inputFile.files[0];
  if (!file || !file.type.startsWith("image/")) return;

  comprobante = file;
  imgPrev.src = URL.createObjectURL(file);
  previewBox.classList.remove("hidden");
  btnEnviar.disabled = false;
});

/* =========================================================
   OBTENER NÚMERO DE PEDIDO (BD REAL)
========================================================= */
async function obtenerNumeroPedido(sb, userId) {
  const { count, error } = await sb
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("Error contando pedidos:", error);
    return 1;
  }

  return (count || 0) + 1;
}

/* =========================================================
   VALIDACIÓN FINAL
========================================================= */
function validarEnvio() {
  if (!metodoPago.value) {
    mostrarError(metodoPago, "Selecciona un método de pago");
    return false;
  }

  if (metodoPago.value === "bank_transfer" && !comprobante) {
    showSnack("Debes subir el comprobante de pago");
    return false;
  }

  return true;
}

/* =========================================================
   ENVIAR PEDIDO
========================================================= */
btnEnviar.addEventListener("click", async () => {
  if (!validarEnvio()) return;

  const sb = window.supabaseClient;
  const user = getUserCache();
  if (!user) return;

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  try {
    const numeroPedido = await obtenerNumeroPedido(sb, user.id);

    const status =
      metodoPago.value === "cash"
        ? "cash_on_delivery"
        : "payment_review";

    const { data: order, error } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: numeroPedido,
        total,
        payment_method: metodoPago.value,
        status
      })
      .select()
      .single();

    if (error) throw error;

    $("numeroPedido").textContent = order.order_number;

    if (metodoPago.value === "bank_transfer") {
      const ext = comprobante.name.split(".").pop();
      const path = `order_${order.id}/${Date.now()}.${ext}`;

      await sb.storage
        .from("payment-receipts")
        .upload(path, comprobante);

      const { data: url } =
        sb.storage.from("payment-receipts").getPublicUrl(path);

      await sb.from("payment_receipts").insert({
        order_id: order.id,
        user_id: user.id,
        file_url: url.publicUrl,
        file_path: path
      });

      showSnack("Pedido enviado. Pago en revisión.");
    } else {
      showSnack("Pedido confirmado. Pago en efectivo al recibir.");
    }

    localStorage.removeItem("cafecortero_cart");

    setTimeout(() => {
      window.location.href = "mis-pedidos.html";
    }, 1400);

  } catch (err) {
    console.error("❌ Pedido:", err);
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
  cargarDatosCliente();
})();
