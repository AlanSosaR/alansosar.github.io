const CART_KEY = 'cafecortero_cart';

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cart-container');
  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = '<div class="empty">No tienes productos en el carrito.</div>';
    document.getElementById('total-box').textContent = 'Total: L 0.00';
    return;
  }

  let total = 0;
  cart.forEach((item, index) => {
    const priceNumber = parseFloat(item.price.replace('L','').trim());
    const lineTotal = priceNumber * item.qty;
    total += lineTotal;

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

  document.getElementById('total-box').textContent = 'Total: L ' + total.toFixed(2);
}

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
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
  } else if (action === 'del') {
    cart.splice(index, 1);
  }

  saveCart(cart);
  renderCart();
});

renderCart();
