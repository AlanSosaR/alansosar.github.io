// ==========================
//   MIS PEDIDOS - CAFÉ CORTERO
// ==========================

// Cargar pedidos desde localStorage
document.addEventListener('DOMContentLoaded', () => {
  const contenedor = document.getElementById('pedidos-container');
  const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];

  if (pedidos.length === 0) {
    contenedor.innerHTML = `
      <p style="text-align:center; margin-top:2rem; color:#4b2e1e; font-weight:500;">
        No tienes pedidos registrados aún ☕
      </p>
    `;
    return;
  }

  pedidos.forEach(pedido => {
    const div = document.createElement('div');
    div.classList.add('pedido');

    // Formatear fecha
    const fecha = new Date(pedido.fecha).toLocaleString('es-HN', {
      dateStyle: 'short',
      timeStyle: 'medium'
    });

    // Crear contenido del pedido
    div.innerHTML = `
      <h3>Pedido N.º ${pedido.numeroPedido}</h3>
      <p><strong>Fecha:</strong> ${fecha}</p>
      <p><strong>Estado:</strong> <span class="estado">${pedido.estado || 'Pendiente'}</span></p>
      <p><strong>Total:</strong> L ${pedido.total.toFixed(2)}</p>
      <div class="detalle">
        ${pedido.productos.map(p => `
          ${p.nombre} x${p.cantidad} = L ${p.subtotal.toFixed(2)}<br>
        `).join('')}
      </div>
    `;

    contenedor.appendChild(div);
  });
});
