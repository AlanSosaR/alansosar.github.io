// ===============================
// CAFÉ CORTERO - LÓGICA DEL SITIO
// ===============================

const CART_KEY = 'cafecortero_cart';

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateCartCount() {
  const cart = getCart();
  const total = cart.reduce((acc, item) => acc + item.qty, 0);
  const badge = document.getElementById('cart-count');
  if (badge) badge.textContent = total;
}

function animateCartIcon() {
  const cartBtn = document.getElementById('cart-btn');
  if (!cartBtn) return;
  cartBtn.classList.add('animate');
  setTimeout(() => cartBtn.classList.remove('animate'), 650);
  if (window.navigator.vibrate) window.navigator.vibrate([60, 40, 60]);
}

function addToCart(product) {
  const cart = getCart();
  const index = cart.findIndex(p => p.name === product.name);
  if (index >= 0) {
    cart[index].qty += 1;
  } else {
    cart.push(product);
  }
  saveCart(cart);
  updateCartCount();
  animateCartIcon();
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  const btnMain = document.getElementById('product-add');
  if (btnMain) {
    btnMain.addEventListener('click', () => {
      const p = {
        name: document.getElementById('product-name').textContent,
        price: document.getElementById('product-price').textContent,
        img: document.getElementById('product-image').src,
        qty: 1
      };
      addToCart(p);
    });
  }

  const cards = document.querySelectorAll('.similar-card');
  cards.forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      document.getElementById('product-name').textContent = card.dataset.name;
      document.getElementById('product-desc').textContent = card.dataset.desc;
      document.getElementById('product-badge').textContent = card.dataset.badge;
      document.getElementById('product-price').textContent = card.dataset.price;
      document.getElementById('product-image').src = card.dataset.img;
    });

    const btn = card.querySelector('button');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const product = {
        name: card.dataset.name,
        price: card.dataset.price,
        img: card.dataset.img,
        qty: 1
      };
      addToCart(product);
    });
  });

  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      window.location.href = 'carrito.html';
    });
  }

  updateCartCount();
});
