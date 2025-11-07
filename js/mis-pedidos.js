// ============================
//  CAFÉ CORTERO - MIS PEDIDOS
// ============================

const contenedor = document.getElementById("pedidos-container");
const pedidos = JSON.parse(localStorage.getItem("cafecortero_pedidos")) || [];

if (!pedidos.length) {
  contenedor.innerHTML = `
    <div style="text-align:center;">
      <p>No tienes pedidos registrados.</p>
      <button class="btn-volver" onclick="window.location.href='index.html'">Volver al inicio</button>
    </div>
  `;
} else {
  renderPedidos();
}

function renderPedidos() {
  contenedor.innerHTML = pedidos
    .map(p => `
      <div class="pedido">
        <h3>Pedido N.º ${p.numero}</h3>
        <p><strong>Fecha:</strong> ${p.fecha}</p>
        <p class="estado"><strong>Estado:</strong> ${p.estado}</p>
        <p><strong>Total:</strong> L ${p.total}</p>
        <div class="detalle">
          ${p.productos.map(prod => `
            <p>${prod.name} x${prod.qty} = L ${(parseFloat(prod.price.replace("L", "").trim()) * prod.qty).toFixed(2)}</p>
          `).join("")}
        </div>
      </div>
    `)
    .join("") +
    `<button class="btn-volver" onclick="window.location.href='index.html'">Volver al inicio</button>`;
}
