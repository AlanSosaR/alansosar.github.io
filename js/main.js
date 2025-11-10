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

// Animación de carrito
function animateCartIcon() {
  const cartBtn = document.getElementById('cart-btn');
  if (!cartBtn) return;
  cartBtn.classList.add('animate');
  setTimeout(() => cartBtn.classList.remove('animate'), 650);
  if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
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

// Cambiar producto principal
function updateMainProduct(product) {
  const mainImg = document.querySelector('.product-img-wrap img');
  const mainTitle = document.querySelector('.product-text h2');
  const mainPrice = document.querySelector('.product-text .price');
  const mainSmall = document.querySelector('.product-text small');
  if (!mainImg || !mainTitle || !mainPrice) return;

  mainImg.src = product.img;
  mainTitle.textContent = product.name;
  mainPrice.textContent = `L ${product.price}`;
  if (mainSmall) mainSmall.textContent = 'Café en grano / molido';
}

document.addEventListener('DOMContentLoaded', () => {
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
  document.querySelectorAll('.drawer-links a').forEach(link => {
    link.addEventListener('click', () => drawer.classList.remove('open'));
  });

  // === CARRITO (ir a carrito.html) ===
  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      window.location.href = 'carrito.html';
    });
  }
  updateCartCount();

  // === CARRUSEL PRINCIPAL (HERO) ===
  const heroTrack = document.querySelector('.hero-track');
  const heroImages = document.querySelectorAll('.hero-track img');
  const heroPrev = document.querySelector('.hero-prev');
  const heroNext = document.querySelector('.hero-next');
  let heroIndex = 0;

  function updateHeroCarousel() {
    if (!heroTrack || !heroImages.length) return;
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

  // Auto
  if (heroImages.length) {
    setInterval(() => {
      heroIndex = (heroIndex + 1) % heroImages.length;
      updateHeroCarousel();
    }, 5000);
  }

  window.addEventListener('resize', updateHeroCarousel);
  updateHeroCarousel();

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

  // arrastre
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  if (similarList) {
    similarList.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - similarList.offsetLeft;
      scrollLeft = similarList.scrollLeft;
    });
    similarList.addEventListener('mouseleave', () => isDown = false);
    similarList.addEventListener('mouseup', () => isDown = false);
    similarList.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - similarList.offsetLeft;
      const walk = (x - startX) * 1.2;
      similarList.scrollLeft = scrollLeft - walk;
    });

    // táctil
    let touchStartX = 0;
    similarList.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].pageX;
    });
    similarList.addEventListener('touchmove', e => {
      const moveX = e.touches[0].pageX - touchStartX;
      similarList.scrollLeft -= moveX / 3;
      touchStartX = e.touches[0].pageX; // para que siga suave
    });
  }

  // === BOTONES DE PRODUCTO ===
  const btnMain = document.getElementById('product-add');
  if (btnMain) {
    btnMain.addEventListener('click', () => {
      const mainImg = document.querySelector('.product-img-wrap img');
      const mainTitle = document.querySelector('.product-text h2');
      const mainPrice = document.querySelector('.product-text .price');

      if (!mainImg || !mainTitle || !mainPrice) return;

      const name = mainTitle.textContent;
      const price = parseFloat(mainPrice.textContent.replace(/[^\d.-]/g, '')) || 0;
      const img = mainImg.src;

      const product = { name, price, img, qty: 1 };
      addToCart(product);
    });
  }

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
      updateMainProduct(product);
    });
  });

  // === FAB ===
  const fabMain = document.getElementById('fab-main');
  const fabContainer = document.querySelector('.fab-container');

  if (fabMain && fabContainer) {
    fabMain.addEventListener('click', () => {
      fabContainer.classList.toggle('active');
    });
  }
});
