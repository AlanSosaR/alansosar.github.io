document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-datos-cliente');
  const formSection = document.getElementById('form-section');
  const reciboSection = document.getElementById('recibo-section');
  const reciboContainer = document.getElementById('recibo-container');
  const volverInicioBtn = document.getElementById('volver-inicio');

  // Si ya existe un pedido guardado, mostrarlo directo
  const pedidoGuardado = JSON.parse(localStorage.getItem('pedidoActual'));
  if (pedidoGuardado) {
    mostrarRecibo(pedidoGuardado);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Obtiene datos del cliente
    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const zona = document.getElementById('zona').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const nota = document.getElementById('nota').value.trim();

    // Obtiene el carrito
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    if (carrito.length === 0) {
      alert("Tu carrito está vacío ☕");
      return;
    }

    // Calcula total
    const total = carrito.reduce((sum, p) => sum + (p.subtotal || 0), 0);

    // Crea el pedido
    const pedido = {
      numeroPedido: `CFC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      fecha: new Date().toISOString(),
      nombre,
      correo,
      telefono,
      zona,
      direccion,
      nota,
      productos: carrito,
      total,
      estado: "Pendiente"
    };

    // Guarda el pedido
    localStorage.setItem('pedidoActual', JSON.stringify(pedido));
    const historial = JSON.parse(localStorage.getItem('misPedidos')) || [];
    historial.push(pedido);
    localStorage.setItem('misPedidos', JSON.stringify(historial));

    // Limpia carrito
    localStorage.removeItem('carrito');

    // Muestra el recibo
    mostrarRecibo(pedido);
  });

  // Función para mostrar el recibo
  function mostrarRecibo(pedido) {
    formSection.style.display = 'none';
    reciboSection.style.display = 'block';

    const fechaFormateada = new Date(pedido.fecha).toLocaleString('es-HN', {
      dateStyle: 'long',
      timeStyle: 'short'
    });

    reciboContainer.innerHTML = `
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
  }

  volverInicioBtn.addEventListener('click', () => {
    localStorage.removeItem('pedidoActual');
    window.location.href = 'index.html';
  });
});
