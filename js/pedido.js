document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-datos-cliente');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const zona = document.getElementById('zona').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const nota = document.getElementById('nota').value.trim();

    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];

    if (carrito.length === 0) {
      alert("Tu carrito está vacío ☕");
      return;
    }

    const total = carrito.reduce((suma, p) => suma + (p.subtotal || 0), 0);

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

    // Guarda pedido actual
    localStorage.setItem('pedidoActual', JSON.stringify(pedido));

    // Agrega a historial
    const historial = JSON.parse(localStorage.getItem('misPedidos')) || [];
    historial.push(pedido);
    localStorage.setItem('misPedidos', JSON.stringify(historial));

    // Limpia carrito
    localStorage.removeItem('carrito');

    // Redirige a recibo
    window.location.href = "recibo.html";
  });
});
