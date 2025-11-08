// --- paso 1: generar número solo si no existe
let numeroPedido = localStorage.getItem("numeroPedidoActivo");

if (!numeroPedido) {
  let consecutivo = localStorage.getItem("ultimoPedido");
  consecutivo = consecutivo ? parseInt(consecutivo) + 1 : 1;
  localStorage.setItem("ultimoPedido", consecutivo);
  numeroPedido = consecutivo;
  localStorage.setItem("numeroPedidoActivo", numeroPedido);
}

// --- paso 2: mostrar número y fecha actual
document.getElementById("numeroPedido").textContent = numeroPedido;
document.getElementById("fechaPedido").textContent = new Date().toLocaleString("es-HN", {
  dateStyle: "short",
  timeStyle: "medium",
  hour12: true
});

// --- paso 3: cargar datos del cliente
const cliente = JSON.parse(localStorage.getItem("cliente_info")) || {};
document.getElementById("nombreCliente").textContent = cliente.nombre || "";
document.getElementById("correoCliente").textContent = cliente.correo || "";
document.getElementById("telefonoCliente").textContent = cliente.telefono || "";
document.getElementById("zonaCliente").textContent = cliente.zona || "";
document.getElementById("direccionCliente").textContent = cliente.direccion || "";
document.getElementById("notaCliente").textContent = cliente.nota || "";

// --- paso 4: cargar carrito
const carrito = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
const lista = document.getElementById("listaProductos");
let total = 0;

carrito.forEach(item => {
  const precioNum = parseFloat(item.price) || 0;
  const li = document.createElement("li");
  li.textContent = `${item.name} x${item.qty} = L ${(precioNum * item.qty).toFixed(2)}`;
  lista.appendChild(li);
  total += precioNum * item.qty;
});

document.getElementById("totalPedido").textContent = total.toFixed(2);

// --- paso 5: editar datos
document.getElementById("btnEditar").addEventListener("click", () => {
  window.location.href = "datos_cliente.html";
});

// --- paso 6: enviar pedido
document.getElementById("btnEnviar").addEventListener("click", () => {
  const pedido = {
    numeroPedido,
    cliente,
    productos: carrito,
    total,
    fecha: new Date().toLocaleString("es-HN", { hour12: true }),
  };

  let pedidos = JSON.parse(localStorage.getItem("misPedidos")) || [];
  pedidos.push(pedido);
  localStorage.setItem("misPedidos", JSON.stringify(pedidos));

  localStorage.removeItem("numeroPedidoActivo");
  localStorage.removeItem("cafecortero_cart");

  alert(`✅ Pedido #${numeroPedido} enviado con éxito`);
  window.location.href = "mis_pedidos.html";
});
