// Recuperar datos del cliente (ya guardados previamente)
const cliente = JSON.parse(localStorage.getItem("datosCliente"));
const detalle = JSON.parse(localStorage.getItem("detallePedido")) || [];

// Si no hay datos, regresar
if (!cliente) {
  window.location.href = "datosCliente.html";
}

// Generar número de pedido único
const numeroPedido = "PED-" + new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
localStorage.setItem("numeroPedido", numeroPedido);

// Calcular total
const total = detalle.reduce((sum, item) => sum + item.total, 0);

// Mostrar datos del cliente
const datosDiv = document.getElementById("datosCliente");
datosDiv.innerHTML = `
  <p><b>Número de pedido:</b> ${numeroPedido}</p>
  <p><b>Nombre:</b> ${cliente.nombre}</p>
  <p><b>Correo:</b> ${cliente.correo}</p>
  <p><b>Teléfono:</b> ${cliente.telefono}</p>
  <p><b>Zona:</b> ${cliente.zona}</p>
  <p><b>Dirección:</b> ${cliente.direccion}</p>
  <p><b>Nota:</b> ${cliente.nota}</p>
`;

// Mostrar productos
const productosDiv = document.getElementById("productos");
if (detalle.length === 0) {
  productosDiv.innerHTML = `<p>No hay productos en este pedido.</p>`;
} else {
  productosDiv.innerHTML = `
    <h3>Productos</h3>
    ${detalle.map(p => `
      <div class="producto">${p.nombre} x${p.cantidad} = L ${p.total.toFixed(2)}</div>
    `).join("")}
  `;
}

// Mostrar total
document.getElementById("total").innerHTML = `<p>💰 <b>Total:</b> L ${total.toFixed(2)}</p>`;

// Botones
document.getElementById("btnAtras").addEventListener("click", () => {
  window.location.href = "datosCliente.html";
});

document.getElementById("btnConfirmar").addEventListener("click", () => {
  const pedidos = JSON.parse(localStorage.getItem("pedidos")) || [];

  const nuevoPedido = {
    id: numeroPedido,
    cliente,
    detalle,
    total,
    fecha: new Date().toLocaleString(),
    estado: "Pendiente"
  };

  pedidos.push(nuevoPedido);
  localStorage.setItem("pedidos", JSON.stringify(pedidos));

  alert("✅ Pedido confirmado correctamente.");
  window.location.href = "misPedidos.html";
});
