document.addEventListener('DOMContentLoaded', () => {
  const btnProceder = document.getElementById('btnProceder');

  if (btnProceder) {
    btnProceder.addEventListener('click', () => {
      // Datos simulados del cliente (estos se llenan desde el formulario real)
      const pedido = {
        numeroPedido: `CFC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        fecha: new Date().toISOString(),
        nombre: "Sosa Mattia",
        correo: "alansosa225@gmail.com",
        telefono: "963225123333333",
        zona: "Danlí",
        direccion: "Barrio abajo",
        nota: "En la mañana",
        productos: [
          { nombre: "Café Cortero 250g", cantidad: 1, subtotal: 180 },
          { nombre: "Café Cortero 500g", cantidad: 1, subtotal: 320 }
        ],
        total: 500
      };

      // Guarda el pedido actual
      localStorage.setItem('pedidoActual', JSON.stringify(pedido));

      // Redirige al recibo
      window.location.href = "recibo.html";
    });
  }
});
