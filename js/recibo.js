console.log("🧾 recibo.js cargado");

/* =========================================================
   MODO DE PÁGINA (HEADER GLOBAL)
   🔑 ESTO ES LO QUE FALTABA
========================================================= */
window.PAGE_MODE = "recibo";

/* =========================
   HELPERS
========================= */
function safe(id) {
  return document.getElementById(id);
}

/* =========================
   PASO 1: NÚMERO DE PEDIDO
========================= */
let numeroPedido = localStorage.getItem("numeroPedidoActivo");

if (!numeroPedido) {
  let consecutivo = localStorage.getItem("ultimoPedido");
  consecutivo = consecutivo ? parseInt(consecutivo) + 1 : 1;

  localStorage.setItem("ultimoPedido", consecutivo);
  numeroPedido = consecutivo;
  localStorage.setItem("numeroPedidoActivo", numeroPedido);
}

/* =========================
   PASO 2: MOSTRAR NÚMERO Y FECHA
========================= */
safe("numeroPedido").textContent = numeroPedido;
safe("fechaPedido").textContent = new Date().toLocaleString("es-HN", {
  dateStyle: "short",
  timeStyle: "medium",
  hour12: true
});

/* =========================
   PASO 3: DATOS DEL CLIENTE (BD REAL)
========================= */
async function cargarDatosCliente() {

  const sb = window.supabaseClient;
  let cliente = {};

  try {
    // 1️⃣ Obtener sesión activa
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData?.session?.user;

    if (user) {
      // 2️⃣ Traer perfil desde BD
      const { data, error } = await sb
        .from("users")
        .select("name, email, phone, zona, direccion")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        cliente = {
          nombre: data.name,
          correo: data.email,
          telefono: data.phone,
          zona: data.zona,
          direccion: data.direccion,
          nota: ""
        };
      }
    }
  } catch (err) {
    console.warn("⚠️ No se pudo cargar cliente desde BD:", err);
  }

  // 3️⃣ Respaldo local si no hubo BD
  if (!cliente.nombre) {
    cliente = JSON.parse(localStorage.getItem("cliente_info")) || {};
  }

  // 4️⃣ Pintar en UI
  safe("nombreCliente").textContent    = cliente.nombre || "";
  safe("correoCliente").textContent    = cliente.correo || "";
  safe("telefonoCliente").textContent  = cliente.telefono || "";
  safe("zonaCliente").textContent      = cliente.zona || "";
  safe("direccionCliente").textContent = cliente.direccion || "";
  safe("notaCliente").textContent      = cliente.nota || "";

  return cliente;
}

/* =========================
   PASO 4: SELECCIÓN DE CAFÉS
========================= */
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

/* =========================
   PASO 5: FLECHA VOLVER
========================= */
safe("btnVolver")?.addEventListener("click", () => {
  history.back();
});

/* =========================
   PASO 6: COMPROBANTE DE PAGO
========================= */
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

/* =========================
   PASO 7: ENVIAR PEDIDO (BD REAL)
========================= */
btnEnviar?.addEventListener("click", async () => {

  if (!comprobanteSeleccionado) {
    alert("⚠️ Debes subir el comprobante de pago antes de enviar el pedido.");
    return;
  }

  safe("loaderEnviar")?.classList.remove("hidden");
  btnEnviar.disabled = true;

  const cliente = await cargarDatosCliente();

  const pedido = {
    numero_pedido: numeroPedido,
    cliente_nombre: cliente.nombre || "",
    cliente_correo: cliente.correo || "",
    cliente_telefono: cliente.telefono || "",
    cliente_zona: cliente.zona || "",
    cliente_direccion: cliente.direccion || "",
    cliente_nota: cliente.nota || "",
    productos: carrito,
    total: total,
    estado: "Pendiente de revisión",
    metodo_pago: "Depósito bancario",
    comprobante_nombre: comprobanteSeleccionado.name,
    comprobante_tipo: comprobanteSeleccionado.type
  };

  const { error } = await window.supabaseClient
    .from("pedidos")
    .insert([pedido]);

  if (error) {
    console.error("❌ Error al guardar pedido:", error);
    alert("Ocurrió un error al enviar el pedido. Intenta nuevamente.");
    btnEnviar.disabled = false;
    safe("loaderEnviar")?.classList.add("hidden");
    return;
  }

  /* =========================
     LIMPIEZA FINAL
  ========================= */
  localStorage.removeItem("numeroPedidoActivo");
  localStorage.removeItem("cafecortero_cart");

  alert(
    `✅ Pedido #${numeroPedido} enviado con éxito.\n` +
    `El comprobante será revisado por un administrador.`
  );

  window.location.href = "mis-pedidos.html";
});

/* =========================
   INIT
========================= */
cargarDatosCliente();
