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

// paso 4: cargar productos desde 'cafecortero_cart'
const carrito = JSON.parse(localStorage.getItem("cafecortero_cart")) || [];
const lista = document.getElementById("listaProductos");
let total = 0;

carrito.forEach(item => {
  const li = document.createElement("li");
  const precioNum = parseFloat(item.price) || 0; // aseguramos número
  li.textContent = `${item.name} x${item.qty} - L. ${(precioNum * item.qty).toFixed(2)}`;
  lista.appendChild(li);
  total += precioNum * item.qty;
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
