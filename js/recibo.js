document.addEventListener('DOMContentLoaded', () => {
  const contenedor = document.getElementById('recibo-container');
  const pedido = JSON.parse(localStorage.getItem('pedidoActual'));

  if (!pedido) {
    contenedor.innerHTML = `
      <div style="text-align:center; padding:20px; background:#fff; border-radius:12px;">
        No se encontró información del pedido ☕
      </div>`;
    return;
  }

  const fechaFormateada = new Date(pedido.fecha).toLocaleString('es-HN', {
    dateStyle: 'long',
    timeStyle: 'short'
  });

  contenedor.innerHTML = `
    <h2>Café Cortero</h2>
    <p><strong>Pedido N.º:</strong> ${pedido.numeroPedido}</p>
    <p><strong>Fecha:</strong> ${fechaFormateada}</p>

    <h2>Datos del cliente</h2>
    <p><strong>Nombre:</strong> ${pedido.nombre}</p>
    <p><strong>Correo:</strong> ${pedido.correo}</p>
    <p><strong>Teléfono:</strong> ${pedido.telefono}</p>
    <p><strong>Zona:</strong> ${pedido.zona}</p>
    <p><strong>Dirección:</strong> ${pedido.direccion}</p>
    <p><strong>Nota:</strong> ${pedido.nota || "—"}</p>

    <h2>Productos</h2>
    ${pedido.productos.map(p => `
      <div class="producto">${p.nombre} x${p.cantidad} = L ${p.subtotal.toFixed(2)}</div>
    `).join('')}

    <p class="total">💰 Total: L ${pedido.total.toFixed(2)}</p>

    <h2>Métodos de pago</h2>
    <p>💵 <strong>Transferencia:</strong> Banco Atlántida, cuenta 123456789 a nombre de Alan Sosa</p>
    <p>📱 <strong>Tigo Money:</strong> +504 9454-6047</p>
  `;
});
