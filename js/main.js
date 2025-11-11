// === CONFIGURACIÓN BASE ===
const CART_KEY = 'cafecortero_cart';

// Obtener carrito
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
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

// Animación del carrito
function animateCartIcon() {
  const cartBtn = document.getElementById('cart-btn');
  if (!cartBtn) return;
  cartBtn.classList.add('animate');
  setTimeout(() => cartBtn.classList.remove('animate'), 650);
  if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
}

// Agregar producto
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

  // === CARRITO ===
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
      const name = document.getElementById('product-name').textContent;
      const price = parseFloat(document.getElementById('product-price').textContent.replace(/[^\d.-]/g, '')) || 0;
      const img = document.getElementById('product-image').getAttribute('src');
      const product = { name, price, img, qty: 1 };
      addToCart(product);
    });
  }

  // === CARRUSEL DE PRODUCTOS ===
  const cards = document.querySelectorAll('.similar-card');
  const sectionProducto = document.getElementById('productos');

  cards.forEach(card => {
    const icon = card.querySelector('.icon-cart');
    const name = card.dataset.name;
    const price = parseFloat(card.dataset.price.replace(/[^\d.-]/g, '')) || 0;
    const img = card.dataset.img;
    const product = { name, price, img, qty: 1 };

    // Click tarjeta = cambiar producto principal + scroll suave hacia arriba
    card.addEventListener('click', e => {
      if (e.target.classList.contains('icon-cart')) return;

      // Actualiza producto principal
      document.getElementById('product-name').textContent = name;
      document.getElementById('product-price').textContent = `L ${price}`;
      const imageEl = document.getElementById('product-image');
      imageEl.src = img;

      // Efecto de desvanecimiento sutil
      imageEl.style.opacity = '0';
      setTimeout(() => {
        imageEl.style.transition = 'opacity 0.4s ease';
        imageEl.style.opacity = '1';
      }, 100);

      // Scroll suave hacia la sección del producto
      if (sectionProducto) {
        sectionProducto.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    });

    // Click ícono carrito = agregar al carrito
    if (icon) {
      icon.addEventListener('click', e => {
        e.stopPropagation();
        addToCart(product);
      });
    }
  });

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
