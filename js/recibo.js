console.log("🧾 recibo.js — versión FINAL alineada a datos_cliente.js");

/* =========================================================
   MODO DE PÁGINA (HEADER GLOBAL)
========================================================= */
window.PAGE_MODE = "recibo";

/* =========================
   HELPERS
========================= */
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
   DATOS DEL CLIENTE — MISMA LÓGICA QUE datos_cliente.js
========================================================= */
async function cargarDatosCliente() {
  const sb = window.supabaseClient;

  let cliente = {
    nombre: "",
    correo: "",
    telefono: "",
    zona: "",
    direccion: "",
    nota: ""
  };

  const userCache = getUserCache();
  if (!userCache) {
    window.location.href = "login.html";
    return cliente;
  }

  try {
    // 1️⃣ USUARIO REAL
    const { data: userRow, error: userError } = await sb
      .from("users")
      .select("id, name, email, phone")
      .eq("id", userCache.id)
      .single();

    if (!userError && userRow) {
      cliente.nombre   = userRow.name || "";
      cliente.correo   = userRow.email || "";
      cliente.telefono = userRow.phone || "";
    }

    // 2️⃣ DIRECCIÓN REAL (addresses) — ÚLTIMA REGISTRADA
const { data: addressRows, error: addressError } = await sb
  .from("addresses")
  .select("id, state, city, street, postal_code")
  .eq("user_id", userCache.id)
  .order("created_at", { ascending: false })
  .limit(1);

if (addressError) {
  console.error("❌ Error cargando dirección:", addressError);
}

if (addressRows && addressRows.length > 0) {
  const address = addressRows[0];

  cliente.zona      = address.state || "";
  cliente.direccion = address.street || "";
  cliente.nota      = address.postal_code || "";
}

  // 3️⃣ PINTAR EN UI
  safe("nombreCliente").textContent    = cliente.nombre;
  safe("correoCliente").textContent    = cliente.correo;
  safe("telefonoCliente").textContent  = cliente.telefono;
  safe("zonaCliente").textContent      = cliente.zona;
  safe("direccionCliente").textContent = cliente.direccion;
  safe("notaCliente").textContent      = cliente.nota;

  return cliente;
}

/* =========================================================
   CAFÉS DEL CARRITO
========================================================= */
const carrito = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
const lista = safe("listaProductos");
let total = 0;

lista.innerHTML = "";

carrito.forEach(item => {
  const precioNum = parseFloat(
    item.price.toString().replace(/[^\d.-]/g, "")
  ) || 0;

  const subtotal = precioNum * item.qty;
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
   ENVIAR PEDIDO
========================================================= */
btnEnviar?.addEventListener("click", async () => {
  if (!comprobanteSeleccionado) {
    alert("Debes subir el comprobante.");
    return;
  }

  btnEnviar.disabled = true;
  safe("loaderEnviar")?.classList.remove("hidden");

  const cliente = await cargarDatosCliente();

  const pedido = {
    numero_pedido: numeroPedido,
    cliente_nombre: cliente.nombre,
    cliente_correo: cliente.correo,
    cliente_telefono: cliente.telefono,
    cliente_zona: cliente.zona,
    cliente_direccion: cliente.direccion,
    cliente_nota: cliente.nota,
    productos: carrito,
    total,
    estado: "Pendiente de revisión",
    metodo_pago: "Depósito bancario",
    comprobante_nombre: comprobanteSeleccionado.name,
    comprobante_tipo: comprobanteSeleccionado.type
  };

  const { error } = await window.supabaseClient
    .from("pedidos")
    .insert([pedido]);

  if (error) {
    console.error(error);
    alert("Error al enviar pedido");
    btnEnviar.disabled = false;
    return;
  }

  localStorage.removeItem("numeroPedidoActivo");
  localStorage.removeItem("cafecortero_cart");

  alert(`Pedido #${numeroPedido} enviado correctamente`);
  window.location.href = "mis-pedidos.html";
});

/* =========================================================
   INIT
========================================================= */
(async function init() {
  await esperarSupabase();
  cargarDatosCliente();
})();
