// paso 1: generar número consecutivo
let numeroPedido = localStorage.getItem("ultimoPedido");
numeroPedido = numeroPedido ? parseInt(numeroPedido) + 1 : 1;
localStorage.setItem("ultimoPedido", numeroPedido);

// paso 2: mostrar número
document.getElementById("numeroPedido").textContent = numeroPedido;

// paso 3: cargar datos del cliente desde 'cliente_info'
const cliente = JSON.parse(localStorage.getItem("cliente_info")) || {};
document.getElementById("nombreCliente").textContent = cliente.nombre || "N/A";
document.getElementById("telefonoCliente").textContent = cliente.telefono || "N/A";
document.getElementById("direccionCliente").textContent = cliente.direccion || "N/A";

// paso 4: cargar productos (usa tu clave real, por ejemplo 'carrito' o 'productos')
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

// paso 5: confirmar pedido
document.getElementById("btnConfirmar").addEventListener("click", () => {
  const pedido = {
    numeroPedido,
    cliente,
    productos: carrito,
    total,
    fecha: new Date().toLocaleString(),
  };

  let pedidos = JSON.parse(localStorage.getItem("misPedidos")) || [];
  pedidos.push(pedido);
  localStorage.setItem("misPedidos", JSON.stringify(pedidos));

  alert(`Pedido #${numeroPedido} confirmado`);
  window.location.href = "mis_pedidos.html";
});
