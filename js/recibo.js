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
   NÚMERO DE PEDIDO (FRONT)
========================================================= */
let numeroPedido = localStorage.getItem("numeroPedidoActivo");

if (!numeroPedido) {
  let consecutivo = localStorage.getItem("ultimoPedido");
  consecutivo = consecutivo ? parseInt(consecutivo) + 1 : 1;

  localStorage.setItem("ultimoPedido", consecutivo);
  numeroPedido = consecutivo;
  localStorage.setItem("numeroPedidoActivo", numeroPedido);
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
    return null;
  }

  try {
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

    if (addr && addr.length) {
      safe("zonaCliente").textContent = addr[0].state || "";
      safe("direccionCliente").textContent = addr[0].street || "";
      safe("notaCliente").textContent = addr[0].postal_code || "";
    }

  } catch (e) {
    console.error("❌ Error cliente:", e);
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

    const div = document.createElement("div");
    div.className = "cafe-item";
    div.innerHTML = `
      <div class="cafe-info">
        <span class="cafe-nombre">${item.name}</span>
        <span class="cafe-cantidad">x${item.qty}</span>
      </div>
      <span class="cafe-precio">L ${subtotal.toFixed(2)}</span>
    `;
    lista.appendChild(div);
  });

  safe("totalPedido").textContent = total.toFixed(2);
}

/* =========================================================
   COMPROBANTE
========================================================= */
let comprobante = null;

const inputFile = safe("inputComprobante");
const previewBox = safe("previewComprobante");
const imgPreview = safe("imgComprobante");
const btnEnviar = safe("btnEnviar");
const loader = safe("loaderEnviar");

safe("btnSubirComprobante")?.addEventListener("click", () => {
  inputFile.click();
});

inputFile?.addEventListener("change", () => {
  const file = inputFile.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("El comprobante debe ser una imagen.");
    return;
  }

  comprobante = file;
  imgPreview.src = URL.createObjectURL(file);
  previewBox.classList.remove("hidden");
  btnEnviar.disabled = false;
});

/* =========================================================
   ENVIAR PEDIDO
========================================================= */
btnEnviar?.addEventListener("click", async () => {
  if (!comprobante) {
    alert("Debes subir el comprobante de pago.");
    return;
  }

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  const sb = window.supabaseClient;
  const user = getUserCache();

  try {
    /* 1️⃣ Crear pedido */
    const { data: order, error: orderErr } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        total,
        status: "payment_review",
        payment_method: "bank_transfer"
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    /* 2️⃣ Subir comprobante */
    const ext = comprobante.name.split(".").pop();
    const path = `order_${order.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await sb.storage
      .from("payment-receipts")
      .upload(path, comprobante);

    if (uploadErr) throw uploadErr;

    const { data: urlData } = sb.storage
      .from("payment-receipts")
      .getPublicUrl(path);

    /* 3️⃣ Guardar referencia */
    const { error: receiptErr } = await sb
      .from("payment_receipts")
      .insert({
        order_id: order.id,
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_path: path
      });

    if (receiptErr) throw receiptErr;

    /* 4️⃣ Limpiar carrito */
    localStorage.removeItem("cafecortero_cart");
    localStorage.removeItem("numeroPedidoActivo");

    alert(`Pedido #${numeroPedido} enviado correctamente`);
    window.location.href = "mis-pedidos.html";

  } catch (err) {
    console.error("❌ Error envío:", err);
    alert("No se pudo enviar el pedido");

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
