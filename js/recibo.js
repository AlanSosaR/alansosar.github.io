console.log("🧾 recibo.js — versión FINAL estable");

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
   ESPERAR SUPABASE (ANTI-BUCLE)
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
   NÚMERO DE PEDIDO
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
  const userCache = getUserCache();

  if (!userCache) {
    window.location.href = "login.html";
    return null;
  }

  const cliente = {
    nombre: "",
    correo: "",
    telefono: "",
    zona: "",
    direccion: "",
    nota: ""
  };

  try {
    // Usuario
    const { data: userRow } = await sb
      .from("users")
      .select("id, name, email, phone")
      .eq("id", userCache.id)
      .single();

    if (userRow) {
      cliente.nombre = userRow.name || "";
      cliente.correo = userRow.email || "";
      cliente.telefono = userRow.phone || "";
    }

    // Última dirección
    const { data: addressRows } = await sb
      .from("addresses")
      .select("state, street, postal_code")
      .eq("user_id", userCache.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (addressRows && addressRows.length) {
      cliente.zona = addressRows[0].state || "";
      cliente.direccion = addressRows[0].street || "";
      cliente.nota = addressRows[0].postal_code || "";
    }

  } catch (err) {
    console.error("❌ Error cargando cliente:", err);
  }

  // Pintar UI
  safe("nombreCliente").textContent = cliente.nombre;
  safe("correoCliente").textContent = cliente.correo;
  safe("telefonoCliente").textContent = cliente.telefono;
  safe("zonaCliente").textContent = cliente.zona;
  safe("direccionCliente").textContent = cliente.direccion;
  safe("notaCliente").textContent = cliente.nota;

  return cliente;
}

/* =========================================================
   CAFÉS DEL CARRITO
========================================================= */
const carrito = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
const lista = safe("listaProductos");
let total = 0;

if (lista) {
  lista.innerHTML = "";

  carrito.forEach(item => {
    const precio = parseFloat(
      item.price.toString().replace(/[^\d.-]/g, "")
    ) || 0;

    const subtotal = precio * item.qty;
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
   VOLVER
========================================================= */
safe("btnVolver")?.addEventListener("click", () => history.back());

/* =========================================================
   COMPROBANTE
========================================================= */
let comprobanteSeleccionado = null;

const inputComprobante = safe("inputComprobante");
const previewBox = safe("previewComprobante");
const imgPreview = safe("imgComprobante");
const btnEnviar = safe("btnEnviar");
const loaderEnviar = safe("loaderEnviar");

safe("btnSubirComprobante")?.addEventListener("click", () => {
  inputComprobante.click();
});

inputComprobante?.addEventListener("change", () => {
  const file = inputComprobante.files[0];
  if (!file) return;

  comprobanteSeleccionado = file;
  imgPreview.src = URL.createObjectURL(file);
  previewBox.classList.remove("hidden");
  btnEnviar.disabled = false;
});

/* =========================================================
   ENVIAR PEDIDO (FINAL)
========================================================= */
btnEnviar?.addEventListener("click", async () => {
  if (!comprobanteSeleccionado) {
    alert("Debes subir el comprobante de pago.");
    return;
  }

  btnEnviar.disabled = true;
  loaderEnviar.classList.remove("hidden");

  const sb = window.supabaseClient;
  const userCache = getUserCache();

  try {
    /* 1️⃣ Crear pedido */
    const { data: pedido, error: pedidoError } = await sb
      .from("orders")
      .insert([{
        user_id: userCache.id,
        total,
        status: "payment_review",
        payment_method: "bank_transfer"
      }])
      .select()
      .single();

    if (pedidoError) throw pedidoError;

    /* 2️⃣ Subir comprobante */
    const ext = comprobanteSeleccionado.name.split(".").pop();
    const filePath = `order-${pedido.id}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from("payment-receipts")
      .upload(filePath, comprobanteSeleccionado);

    if (uploadError) throw uploadError;

    const { data: urlData } = sb.storage
      .from("payment-receipts")
      .getPublicUrl(filePath);

    /* 3️⃣ Guardar en payment_receipts */
    const { error: receiptError } = await sb
      .from("payment_receipts")
      .insert([{
        order_id: pedido.id,
        user_id: userCache.id,
        file_url: urlData.publicUrl,
        file_path: filePath
      }]);

    if (receiptError) throw receiptError;

    /* 4️⃣ Limpiar carrito */
    localStorage.removeItem("cafecortero_cart");
    localStorage.removeItem("numeroPedidoActivo");

    alert(`Pedido #${numeroPedido} enviado correctamente`);
    window.location.href = "mis-pedidos.html";

  } catch (err) {
    console.error("❌ Error:", err);
    alert("Error al enviar el pedido");

    btnEnviar.disabled = false;
    loaderEnviar.classList.add("hidden");
  }
});

/* =========================================================
   INIT
========================================================= */
(async function init() {
  await esperarSupabase();
  cargarDatosCliente();
})();
