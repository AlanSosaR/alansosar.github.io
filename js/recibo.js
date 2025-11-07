document.addEventListener('DOMContentLoaded', () => {
  const reciboDiv = document.getElementById('recibo');
  const volverBtn = document.getElementById('volverInicio');

  const pedido = JSON.parse(localStorage.getItem('pedidoActual'));

  if (!pedido) {
    reciboDiv.innerHTML = `
      <div class="mensaje-vacio">
        No se encontró información del pedido ☕
      </div>`;
    return;
  }

  const fechaFormateada = new Date(pedido.fecha).toLocaleString('es-HN', {
    dateStyle: 'long',
    timeStyle: 'short'
  });

  reciboDiv.innerHTML = `
    <div class="recibo-card">
      <div class="encabezado">
        <img src="imagenes/logo%20mejorado%20trasmparente.png" alt="Café Cortero" class="recibo-logo">
        <h2>Café Cortero</h2>
      </div>

      <p><strong>Pedido N.º:</strong> ${pedido.numeroPedido}</p>
      <p><strong>Fecha:</strong> ${fechaFormateada}</p>

      <h3 class="seccion-titulo verde">Datos del cliente</h3>
      <p><strong>Nombre:</strong> ${pedido.nombre}</p>
      <p><strong>Correo:</strong> ${pedido.correo}</p>
      <p><strong>Teléfono:</strong> ${pedido.telefono}</p>
      <p><strong>Zona:</strong> ${pedido.zona}</p>
      <p><strong>Dirección:</strong> ${pedido.direccion}</p>
      <p><strong>Nota:</strong> ${pedido.nota || '—'}</p>

      <h3 class="seccion-titulo verde">Productos</h3>
      ${pedido.productos.map(p => `
        <div class="producto">${p.nombre} x${p.cantidad} = L ${p.subtotal.toFixed(2)}</div>
      `).join('')}

      <p class="total">💰 <strong>Total:</strong> L ${pedido.total.toFixed(2)}</p>

      <h3 class="seccion-titulo verde">Métodos de pago</h3>
      <p>💵 <strong>Transferencia bancaria:</strong> Banco Atlántida, cuenta 123456789 a nombre de Alan Sosa</p>
      <p>📱 <strong>Tigo Money:</strong> +504 9454-6047</p>
    </div>
  `;

  volverBtn.addEventListener('click', () => {
    localStorage.removeItem('pedidoActual');
    window.location.href = 'index.html';
  });
});
