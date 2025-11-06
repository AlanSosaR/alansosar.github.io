// ==========================
// CAFÉ CORTERO - MAIN JS
// ==========================

const CART_KEY = 'cafecortero_cart';

// Recuperar carrito desde localStorage
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

// Guardar carrito en localStorage
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// Actualizar el contador del carrito
function updateCartCount() {
  const cart = getCart();
  const total = cart.reduce((acc, item) => acc + item.qty, 0);
  document.getElementById('cart-count').textContent = total;
}

// Animación tipo Amazon + vibración
function animateCartIcon() {
  const cartBtn = document.getElementById('cart-btn');
  cartBtn.classList.add('animate');
  setTimeout(() => cartBtn.classList.remove('animate'), 650);

  // Vibración notoria al agregar producto
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
}

// Agregar producto al carrito
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

// ==========================
// EVENTOS
// ==========================

// Botón principal "Agregar al carrito"
document.getElementById('product-add').addEventListener('click', () => {
  const product = {
    name: document.getElementById('product-name').textContent,
    price: document.getElementById('product-price').textContent,
    img: document.getElementById('product-image').getAttribute('src'),
    qty: 1
  };
  addToCart(product);
});

// Tarjetas del carrusel
const cards = document.querySelectorAll('.similar-card');
cards.forEach(card => {
  // Cambiar el producto principal al hacer click en una tarjeta
  card.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;

    cards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    document.getElementById('product-name').textContent = card.dataset.name;
    document.getElementById('product-desc').textContent = card.dataset.desc;
    document.getElementById('product-badge').textContent = card.dataset.badge;
    document.getElementById('product-price').textContent = card.dataset.price;
    document.getElementById('product-image').src = card.dataset.img;
  });

  // Botón dentro de la tarjeta
  const btn = card.querySelector('button');
  btn.addEventListener('click', (e) => {
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

// Ir al carrito
document.getElementById('cart-btn').addEventListener('click', () => {
  window.location.href = 'carrito.html';
});

// Inicializar contador al cargar
updateCartCount();
