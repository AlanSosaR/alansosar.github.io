document.addEventListener("DOMContentLoaded", () => {
  const pedido = JSON.parse(localStorage.getItem("pedidoFinal"));
  const numeroPedido = localStorage.getItem("numeroPedido");

  const numeroPedidoSpan = document.getElementById("numeroPedido");
  const fechaPedidoP = document.getElementById("fechaPedido");
  const datosClienteDiv = document.getElementById("datosCliente");
  const listaProductosDiv = document.getElementById("listaProductos");
  const totalPedidoSpan = document.getElementById("totalPedido");

  if (!pedido) {
    document.getElementById("recibo-card").innerHTML =
      "<p>No se encontró información del pedido ☕</p>";
    return;
  }

  numeroPedidoSpan.textContent = numeroPedido || "CFC-XXXX";
  fechaPedidoP.textContent = pedido.fecha || new Date().toLocaleString("es-HN");

  const c = pedido.cliente;
  datosClienteDiv.innerHTML = `
    <p><strong>Nombre:</strong> ${c.nombre}</p>
    <p><strong>Correo:</strong> ${c.correo}</p>
    <p><strong>Teléfono:</strong> ${c.telefono}</p>
    <p><strong>Zona:</strong> ${c.zona}</p>
    <p><strong>Dirección:</strong> ${c.direccion}</p>
    <p><strong>Nota:</strong> ${c.nota || "Sin nota"}</p>
  `;

  listaProductosDiv.innerHTML = pedido.carrito
    .map(
      (p) =>
        `<div class="producto">${p.nombre} x${p.cantidad} = L ${(p.precio * p.cantidad).toFixed(2)}</div>`
    )
    .join("");

  totalPedidoSpan.textContent = pedido.total.toFixed(2);
});

// ✅ Función para enviar pedido a “Mis pedidos”
function enviarPedido() {
  const pedidoActual = JSON.parse(localStorage.getItem("pedidoFinal"));
  const numeroPedido = localStorage.getItem("numeroPedido");

  if (!pedidoActual || !numeroPedido) {
    alert("No se encontró información del pedido para enviar.");
    return;
  }

  // Obtener pedidos previos
  let pedidos = JSON.parse(localStorage.getItem("misPedidos")) || [];

  // Agregar el nuevo pedido
  pedidos.push({
    id: numeroPedido,
    fecha: pedidoActual.fecha,
    cliente: pedidoActual.cliente,
    carrito: pedidoActual.carrito,
    total: pedidoActual.total,
    estado: "Pendiente",
  });

  // Guardar nuevamente
  localStorage.setItem("misPedidos", JSON.stringify(pedidos));

  alert("✅ Pedido enviado con éxito. Puedes verlo en 'Mis pedidos'.");
  window.location.href = "mis-pedidos.html";
}
