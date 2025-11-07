// =============================
// RECIBO DEL PEDIDO
// Café Cortero ☕
// =============================

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("recibo-contenido");

  // Recuperar los datos del cliente desde cliente_info
  const cliente = JSON.parse(localStorage.getItem("cliente_info"));
  const detalle = JSON.parse(localStorage.getItem("detallePedido")) || [];

  // Si no hay datos, redirigir
  if (!cliente) {
    contenedor.innerHTML = "<p>No se encontraron datos del cliente. Regresando...</p>";
    setTimeout(() => window.location.href = "datosCliente.html", 2000);
    return;
  }

  // Generar número de pedido único
  const numeroPedido = "PED-" + new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
  localStorage.setItem("numeroPedido", numeroPedido);

  // Calcular total
  const total = detalle.reduce((sum, item) => sum + item.total, 0);

  // Mostrar los datos en pantalla
  contenedor.innerHTML = `
    <h3>Datos del cliente</h3>
    <p><b>Número de pedido:</b> ${numeroPedido}</p>
    <p><b>Nombre:</b> ${cliente.nombre}</p>
    <p><b>Correo:</b> ${cliente.correo}</p>
    <p><b>Teléfono:</b> ${cliente.telefono}</p>
    <p><b>Zona:</b> ${cliente.zona}</p>
    <p><b>Dirección:</b> ${cliente.direccion}</p>
    <p><b>Nota:</b> ${cliente.nota || "-"}</p>
    <hr>
    <h3>Productos</h3>
    ${
      detalle.length
        ? detalle.map(p => `
            <div class="producto">${p.nombre} x${p.cantidad} = L ${p.total.toFixed(2)}</div>
          `).join("")
        : "<p>No hay productos registrados.</p>"
    }
    <p class="total">💰 <b>Total:</b> L ${total.toFixed(2)}</p>
  `;

  // Botón para regresar a editar
  document.getElementById("btnEditar").addEventListener("click", () => {
    window.location.href = "datosCliente.html";
  });

  // Botón para confirmar pedido
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
});
