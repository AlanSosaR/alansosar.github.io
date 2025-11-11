// === CONFIGURACIÓN BASE ===
const CART_KEY = 'cafecortero_cart';

// Obtener carrito
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

// Guardar carrito
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// Actualizar contador del carrito
function updateCartCount() {
  const cart = getCart();
  const total = cart.reduce((acc, item) => acc + item.qty, 0);
  const badge = document.getElementById('cart-count');
  if (badge) badge.textContent = total;
}

// 🟡 Animación tipo Amazon (pulso suave + brillo sutil)
function animateCartIcon() {
  const cartBtn = document.getElementById('cart-btn');
  if (!cartBtn) return;
  cartBtn.classList.add('animate');
  setTimeout(() => cartBtn.classList.remove('animate'), 600);
  if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
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
  animateCartIcon(); // ✅ Solo efecto visual, no redirección
}

// === MAIN ===
document.addEventListener('DOMContentLoaded', () => {

  // === MENÚ MÓVIL ===
  const menuToggle = document.getElementById('menu-toggle');
  const drawer = document.getElementById('drawer');
  const drawerLogo = drawer ? drawer.querySelector('img') : null;

  if (menuToggle && drawer) {
    menuToggle.addEventListener('click', () => drawer.classList.add('open'));
  }
  if (drawerLogo) {
    drawerLogo.addEventListener('click', () => {
      drawer.classList.remove('open');
      window.location.href = 'index.html';
    });
  }
  document.querySelectorAll('.drawer-links a').forEach(link => {
    link.addEventListener('click', () => drawer.classList.remove('open'));
  });

  // === HERO CAROUSEL ===
  const heroImgs = document.querySelectorAll('.hero-carousel img');
  let heroIndex = 0;

  function showHeroImage(index) {
    heroImgs.forEach(img => img.classList.remove('active'));
    heroImgs[index].classList.add('active');
  }

  function nextHeroImage() {
    heroIndex = (heroIndex + 1) % heroImgs.length;
    showHeroImage(heroIndex);
  }

  if (heroImgs.length) {
    heroImgs[0].classList.add('active');
    setInterval(nextHeroImage, 8000);
  }

  // === CARRITO (botón superior) ===
  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      window.location.href = 'carrito.html';
    });
  }
  updateCartCount();

  // === PRODUCTO PRINCIPAL ===
  const btnMain = document.getElementById('product-add');
  if (btnMain) {
    btnMain.addEventListener('click', () => {
      const name = document.getElementById('product-name').textContent.trim();
      const price = parseFloat(document.querySelector('.price-part')?.textContent.replace(/[^\d.-]/g, '')) || 0;
      const img = document.getElementById('product-image').getAttribute('src');
      const product = { name, price, img, qty: 1 };
      addToCart(product); // ✅ Solo efecto visual, sin redirigir
    });
  }

  // === CARRUSEL DE PRODUCTOS ===
  const cards = document.querySelectorAll('.similar-card');
  cards.forEach(card => {
    const name = card.dataset.name;
    const price = parseFloat(card.dataset.price.replace(/[^\d.-]/g, '')) || 0;
    const img = card.dataset.img;
    const product = { name, price, img, qty: 1 };

    // Click tarjeta = cambia producto principal + scroll suave + marcar tarjeta
    card.addEventListener('click', e => {
      if (e.target.classList.contains('icon-cart')) return;

      // Marcar tarjeta seleccionada
      cards.forEach(c => c.classList.remove('active-card'));
      card.classList.add('active-card');

      // Actualizar producto principal
      document.getElementById('product-name').textContent = name;
      const priceEl = document.querySelector('.price-part');
      if (priceEl) priceEl.textContent = `L ${price}`;
      const imageEl = document.getElementById('product-image');
      imageEl.src = img;

      // Pequeña animación de fade
      imageEl.style.opacity = '0';
      setTimeout(() => {
        imageEl.style.transition = 'opacity 0.4s ease';
        imageEl.style.opacity = '1';
      }, 100);

      // Scroll suave hacia el producto principal
      const productoSection = document.getElementById('productos');
      if (productoSection) {
        const offset = productoSection.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    });
  });

  // === FLECHAS DEL CARRUSEL ===
  const carousel = document.querySelector('.similar-list');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');

  if (carousel && prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: -220, behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: 220, behavior: 'smooth' });
    });
  }

  // === FAB ===
  const fabMain = document.getElementById('fab-main');
  const fabContainer = document.querySelector('.fab-container');
  if (fabMain && fabContainer) {
    fabMain.addEventListener('click', e => {
      e.stopPropagation();
      fabContainer.classList.toggle('active');
    });
    document.addEventListener('click', e => {
      if (!fabContainer.contains(e.target)) {
        fabContainer.classList.remove('active');
      }
    });
  }
});
