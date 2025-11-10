const CART_KEY = 'cafecortero_cart';

// --- obtener y guardar carrito
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// --- renderizar carrito
function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cart-container');
  const mensaje = document.getElementById('mensaje-carrito');
  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = '<div class="empty">No tienes productos en el carrito.</div>';
    document.getElementById('total-box').textContent = 'Total: L 0.00';
    if (mensaje) mensaje.textContent = '';
    return;
  }

  let total = 0;
  cart.forEach((item, index) => {
    // limpiar precio si viene con texto (ej. "L 250" o "250 L")
    const priceNumber = parseFloat(item.price.toString().replace(/[^\d.-]/g, '')) || 0;
    const lineTotal = priceNumber * item.qty;
    total += lineTotal;

    // actualizar carrito con precio numérico limpio
    item.price = priceNumber;

    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <img src="${item.img}" alt="${item.name}">
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-price">L ${priceNumber.toFixed(2)} / unidad</div>
        <div class="qty-controls">
          <button class="qty-btn" data-action="minus" data-index="${index}">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-action="plus" data-index="${index}">+</button>
          <button class="del-btn" data-action="del" data-index="${index}">&times;</button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  // guardar carrito actualizado (precios limpios)
  saveCart(cart);

  document.getElementById('total-box').textContent = 'Total: L ' + total.toFixed(2);
  if (mensaje) mensaje.textContent = '';
}

// --- controles del carrito
document.getElementById('cart-container').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;
  const index = parseInt(btn.dataset.index, 10);
  const cart = getCart();

  if (action === 'plus') {
    cart[index].qty += 1;
  } else if (action === 'minus') {
    cart[index].qty -= 1;
    if (cart[index].qty <= 0) cart.splice(index, 1);
  } else if (action === 'del') {
    cart.splice(index, 1);
  }

  saveCart(cart);
  renderCart();
});

// --- botón Proceder con el pedido
const procederBtn = document.getElementById('proceder-btn');
if (procederBtn) {
  procederBtn.addEventListener('click', () => {
    const cart = getCart();
    const mensaje = document.getElementById('mensaje-carrito');

    if (cart.length === 0) {
      if (mensaje) {
        mensaje.textContent = "☕ Aún no tienes productos en tu carrito. Agrega tu café favorito para continuar.";
      } else {
        alert("☕ Tu carrito está vacío. Agrega productos antes de continuar.");
      }
    } else {
      window.location.href = "datos_cliente.html";
    }
  });
}

// --- inicializar
renderCart();
