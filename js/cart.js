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
  container.innerHTML = '';

  // 🔹 Si el carrito está vacío
  if (cart.length === 0) {
    container.innerHTML = '<div class="empty">No tienes productos en el carrito.</div>';
    document.getElementById('total-box').textContent = 'Total: L 0.00';
    return;
  }

  // 🔹 Si hay productos
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

  // mostrar total
  document.getElementById('total-box').textContent = 'Total: L ' + total.toFixed(2);
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

// --- inicializar
renderCart();
