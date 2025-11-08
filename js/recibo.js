// paso 3: obtener o generar número consecutivo
let numeroPedido = localStorage.getItem("ultimoPedido");
numeroPedido = numeroPedido ? parseInt(numeroPedido) + 1 : 1;
localStorage.setItem("ultimoPedido", numeroPedido);

// paso 4: mostrar número
document.getElementById("numeroPedido").textContent = numeroPedido;

// paso 5: cargar datos del cliente desde localStorage
const datosCliente = JSON.parse(localStorage.getItem("datosCliente")) || {};
document.getElementById("nombreCliente").textContent = datosCliente.nombre || "N/A";
document.getElementById("telefonoCliente").textContent = datosCliente.telefono || "N/A";
document.getElementById("direccionCliente").textContent = datosCliente.direccion || "N/A";

// paso 6: cargar productos
const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
const lista = document.getElementById("listaProductos");
let total = 0;

carrito.forEach(item => {
  const li = document.createElement("li");
  li.textContent = `${item.nombre} x${item.cantidad} - L. ${item.precio * item.cantidad}`;
  lista.appendChild(li);
  total += item.precio * item.cantidad;
});

document.getElementById("totalPedido").textContent = total.toFixed(2);

// paso 7: confirmar pedido (guardar todo)
document.getElementById("btnConfirmar").addEventListener("click", () => {
  const pedido = {
    numeroPedido,
    cliente: datosCliente,
    productos: carrito,
    total,
    fecha: new Date().toLocaleString(),
  };

  let pedidos = JSON.parse(localStorage.getItem("misPedidos")) || [];
  pedidos.push(pedido);
  localStorage.setItem("misPedidos", JSON.stringify(pedidos));

  alert(`Pedido #${numeroPedido} confirmado`);
  window.location.href = "mis_pedidos.html"; // redirigir
});
