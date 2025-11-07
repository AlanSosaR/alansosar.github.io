// =============================
// RECIBO DEL PEDIDO
// Café Cortero ☕
// =============================

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("recibo-contenido");

  // Recuperar datos guardados
  const cliente = JSON.parse(localStorage.getItem("cliente_info")); // ← esta es la clave correcta
  const detalle = JSON.parse(localStorage.getItem("detallePedido")) || [];

  // Si no hay datos del cliente, mostrar aviso
  if (!cliente) {
    contenedor.innerHTML = `
      <p style="color:#a33;">⚠️ No se encontraron los datos del cliente.</p>
      <p>Serás redirigido para completarlos nuevamente...</p>
    `;
    setTimeout(() => window.location.href = "datosCliente.html", 2500);
    return;
  }

  // Generar número de pedido único
  const numeroPedido = "PED-" + new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
  localStorage.setItem("numeroPedido", numeroPedido);

  // Calcular total del pedido
  const total = detalle.reduce((sum, item) => sum + item.total, 0);

  // Construir HTML del recibo
  contenedor.innerHTML = `
    <div style="background:#f7efe9;padding:12px;border-radius:10px;margin-bottom:15px;text-align:center;">
      <b style="color:#5C4033;">Número de pedido:</b> <br>
      <span style="font-size:1.2em;color:#2E7D32;font-weight:bold;">${numeroPedido}</span>
    </div>

    <h3 style="margin-top:0;">Datos del cliente</h3>
    <p><b>Nombre:</b> ${cliente.nombre}</p>
    <p><b>Correo:</b> ${cliente.correo}</p>
    <p><b>Teléfono:</b> ${cliente.telefono}</p>
    <p><b>Zona:</b> ${cliente.zona}</p>
    <p><b>Dirección:</b> ${cliente.direccion}</p>
    <p><b>Nota:</b> ${cliente.nota || "-"}</p>

    <hr style="margin:15px 0;">

    <h3>Productos</h3>
    ${
      detalle.length
        ? detalle.map(p => `
          <div style="background:#eee;border-radius:6px;padding:8px;margin:4px 0;">
            ${p.nombre} x${p.cantidad} = L ${p.total.toFixed(2)}
          </div>
        `).join("")
        : "<p>No hay productos registrados.</p>"
    }

    <p style="font-weight:bold;margin-top:12px;text-align:right;">
      💰 Total: L ${total.toFixed(2)}
    </p>
  `;

  // Botones
  document.getElementById("btnEditar").addEventListener("click", () => {
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
});
