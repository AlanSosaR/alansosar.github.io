// === CONFIGURACIÓN BASE ===
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
  if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
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

// === MENÚ MÓVIL ===
const menuToggle = document.getElementById('menu-toggle');
const drawer = document.getElementById('drawer');
const drawerClose = document.getElementById('drawer-close');

if (menuToggle && drawer) {
  menuToggle.addEventListener('click', () => drawer.classList.add('open'));
}
if (drawerClose) {
  drawerClose.addEventListener('click', () => drawer.classList.remove('open'));
}

// === FAB (BOTONES FLOTANTES) ===
const fabMain = document.getElementById('fab-main');
const fabContainer = document.querySelector('.fab');

if (fabMain && fabContainer) {
  fabMain.addEventListener('click', () => {
    fabContainer.classList.toggle('show');
  });
}

// === CARRITO ===
const cartBtn = document.getElementById('cart-btn');
if (cartBtn) {
  cartBtn.addEventListener('click', () => {
    window.location.href = 'carrito.html';
  });
}

// === HERO CARRUSEL PRINCIPAL ===
const heroTrack = document.querySelector('.hero-track');
const heroImages = document.querySelectorAll('.hero-track img');
const heroPrev = document.querySelector('.hero-prev');
const heroNext = document.querySelector('.hero-next');
let heroIndex = 0;

function updateHeroCarousel() {
  const width = heroImages[0].clientWidth;
  heroTrack.style.transform = `translateX(-${heroIndex * width}px)`;
}

if (heroNext) {
  heroNext.addEventListener('click', () => {
    heroIndex = (heroIndex + 1) % heroImages.length;
    updateHeroCarousel();
  });
}

if (heroPrev) {
  heroPrev.addEventListener('click', () => {
    heroIndex = (heroIndex - 1 + heroImages.length) % heroImages.length;
    updateHeroCarousel();
  });
}

// Movimiento automático cada 5 segundos
setInterval(() => {
  heroIndex = (heroIndex + 1) % heroImages.length;
  updateHeroCarousel();
}, 5000);

// === CARRUSEL DE PRODUCTOS ===
const similarList = document.getElementById('lista-similares');
const carouselPrev = document.querySelector('.carousel-prev');
const carouselNext = document.querySelector('.carousel-next');

if (carouselNext && similarList) {
  carouselNext.addEventListener('click', () => {
    similarList.scrollBy({ left: 220, behavior: 'smooth' });
  });
}

if (carouselPrev && similarList) {
  carouselPrev.addEventListener('click', () => {
    similarList.scrollBy({ left: -220, behavior: 'smooth' });
  });
}

// Soporte táctil para móvil
let isDown = false;
let startX;
let scrollLeft;

if (similarList) {
  similarList.addEventListener('mousedown', (e) => {
    isDown = true;
    similarList.classList.add('active');
    startX = e.pageX - similarList.offsetLeft;
    scrollLeft = similarList.scrollLeft;
  });
  similarList.addEventListener('mouseleave', () => {
    isDown = false;
    similarList.classList.remove('active');
  });
  similarList.addEventListener('mouseup', () => {
    isDown = false;
    similarList.classList.remove('active');
  });
  similarList.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - similarList.offsetLeft;
    const walk = (x - startX) * 1.2;
    similarList.scrollLeft = scrollLeft - walk;
  });
}

// === AGREGAR PRODUCTOS AL CARRITO ===
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();

  // Botón principal del producto destacado
  const btnMain = document.getElementById('product-add');
  if (btnMain) {
    btnMain.addEventListener('click', () => {
      const product = {
        name: 'Café Cortero 250g',
        price: 180,
        img: 'imagenes/bolsa-1.png',
        qty: 1
      };
      addToCart(product);
    });
  }

  // Botones de las tarjetas
  const productButtons = document.querySelectorAll('.similar-card button');
  productButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.similar-card');
      const name = card.querySelector('h4').textContent;
      const priceText = card.querySelector('.price-sm').textContent;
      const img = card.querySelector('img').src;
      const price = parseFloat(priceText.replace(/[^\d.-]/g, '')) || 0;

      const product = { name, price, img, qty: 1 };
      addToCart(product);
    });
  });
});
