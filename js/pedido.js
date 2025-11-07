// =============================
//  SISTEMA DE RECIBO + ENVÍO DE PEDIDO
//  Café Cortero ☕
// =============================

// Inicializar EmailJS con tu clave pública
emailjs.init("ruZ3fWeR8bNiW4jrN"); // ✅ Tu Public Key

// Cargar datos del carrito y del cliente desde localStorage
const cart = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
const cliente = JSON.parse(localStorage.getItem("cliente_info")) || null;
const reciboContainer = document.getElementById("recibo-container");

if (!cart.length || !cliente) {
  reciboContainer.innerHTML = `
    <div style="text-align:center; padding: 2rem;">
      <p>No hay datos del pedido.</p>
      <button class="btn btn-green" onclick="window.location.href='index.html'">
        Volver al inicio
      </button>
    </div>
  `;
} else {
  renderRecibo();
}

// Mostrar recibo con datos del cliente y productos
function renderRecibo() {
  let total = 0;
  let productosHTML = "";

  cart.forEach(item => {
    const precio = parseFloat(item.price.replace("L", "").trim());
    const subtotal = precio * item.qty;
    total += subtotal;
    productosHTML += `<li>${item.name} x${item.qty} = L ${subtotal.toFixed(2)}</li>`;
  });

  const fecha = new Date().toLocaleString("es-HN", { 
    day: "2-digit", month: "2-digit", year: "numeric", 
    hour: "2-digit", minute: "2-digit" 
  });

  reciboContainer.innerHTML = `
    <div class="recibo-section">
      <h3><img src="imagenes/13.png" alt="Café Cortero"> Café Cortero</h3>
      <p><strong>Fecha:</strong> ${fecha}</p>
    </div>

    <div class="recibo-section">
      <h4>Datos del cliente</h4>
      <p><strong>Nombre:</strong> ${cliente.nombre}</p>
      <p><strong>Correo:</strong> ${cliente.correo}</p>
      <p><strong>Teléfono:</strong> ${cliente.telefono || "No especificado"}</p>
      <p><strong>Zona:</strong> ${cliente.zona}</p>
      <p><strong>Dirección:</strong> ${cliente.direccion}</p>
      ${cliente.nota ? `<p><strong>Nota:</strong> ${cliente.nota}</p>` : ""}
    </div>

    <div class="recibo-section">
      <h4>Productos</h4>
      <ul class="product-list">${productosHTML}</ul>
      <div class="total">💰 Total: L ${total.toFixed(2)}</div>
    </div>

    <div class="recibo-section">
      <h4>Métodos de pago</h4>
      <p>💵 <strong>Transferencia bancaria:</strong> Banco Atlántida, cuenta 123456789 a nombre de Alan Sosa</p>
      <p>📱 <strong>Tigo Money:</strong> +504 9454-6047</p>
      <p>💳 <strong>PayPal:</strong> <a href="https://www.paypal.me/cafecortero" target="_blank">paypal.me/cafecortero</a></p>
    </div>
  `;
}

// Enviar pedido por correo usando EmailJS
function enviarPedido() {
  if (!cart.length || !cliente) return alert("No hay pedido para enviar.");

  const total = cart.reduce(
    (acc, item) => acc + parseFloat(item.price.replace("L", "").trim()) * item.qty,
    0
  );

  const templateParams = {
    nombre: cliente.nombre,
    correo: cliente.correo,
    telefono: cliente.telefono || "No especificado",
    zona: cliente.zona,
    direccion: cliente.direccion,
    nota: cliente.nota || "Sin nota",
    productos: cart
      .map(p => `${p.name} x${p.qty} = L ${(parseFloat(p.price.replace("L", "").trim()) * p.qty).toFixed(2)}`)
      .join("\n"),
    total: total.toFixed(2)
  };

  // Enviar correo con EmailJS
  emailjs.send("service_f20ze8o", "template_rn6l0o5", templateParams)
    .then(() => {
      alert("✅ Pedido enviado con éxito. ¡Gracias por comprar con Café Cortero!");

      // Vaciar carrito
      localStorage.removeItem("cafecortero_cart");

      // Redirigir al inicio después de 3 segundos
      setTimeout(() => {
        window.location.href = "index.html";
      }, 3000);
    })
    .catch(err => {
      console.error("Error al enviar:", err);
      alert("❌ Ocurrió un error al enviar el pedido. Inténtalo nuevamente.");
    });
}
