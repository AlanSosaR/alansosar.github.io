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

// === EJECUCIÓN PRINCIPAL ===
document.addEventListener('DOMContentLoaded', () => {
  // === MENÚ MÓVIL ===
  const menuToggle = document.getElementById('menu-toggle');
  const drawer = document.getElementById('drawer');
  const drawerLogo = drawer ? drawer.querySelector('img') : null;

  if (menuToggle && drawer) {
    menuToggle.addEventListener('click', () => drawer.classList.add('open'));
  }

  // Cerrar al hacer clic en logo o enlaces
  if (drawerLogo) {
    drawerLogo.addEventListener('click', () => {
      drawer.classList.remove('open');
      window.location.href = 'index.html';
    });
  }

  document.querySelectorAll('.drawer-links a').forEach(link => {
    link.addEventListener('click', () => drawer.classList.remove('open'));
  });

  // === CARRITO ===
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
  let heroTimer;

  function updateHeroCarousel() {
    if (!heroTrack || !heroImages.length) return;
    const width = heroImages[0].clientWidth;
    heroTrack.style.transition = 'transform 1.5s ease-in-out';
    heroTrack.style.transform = `translateX(-${heroIndex * width}px)`;
  }

  function nextHero() {
    heroIndex = (heroIndex + 1) % heroImages.length;
    updateHeroCarousel();
  }

  function prevHero() {
    heroIndex = (heroIndex - 1 + heroImages.length) % heroImages.length;
    updateHeroCarousel();
  }

  if (heroNext) heroNext.addEventListener('click', () => {
    nextHero();
    restartHeroTimer();
  });
  if (heroPrev) heroPrev.addEventListener('click', () => {
    prevHero();
    restartHeroTimer();
  });

  // Swipe táctil
  let startX = 0;
  if (heroTrack) {
    heroTrack.addEventListener('touchstart', e => startX = e.touches[0].clientX);
    heroTrack.addEventListener('touchend', e => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? prevHero() : nextHero();
        restartHeroTimer();
      }
    });
  }

  function startHeroTimer() {
    heroTimer = setInterval(nextHero, 8000);
  }
  function restartHeroTimer() {
    clearInterval(heroTimer);
    startHeroTimer();
  }
  startHeroTimer();
  window.addEventListener('resize', updateHeroCarousel);
  updateHeroCarousel();

  // === CARRUSEL DE PRODUCTOS ===
  const similarList = document.getElementById('lista-similares');
  const carouselPrev = document.querySelector('.carousel-prev');
  const carouselNext = document.querySelector('.carousel-next');

  if (carouselNext && similarList) {
    carouselNext.addEventListener('click', () => {
      if (similarList.scrollLeft + similarList.clientWidth >= similarList.scrollWidth - 10) {
        similarList.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        similarList.scrollBy({ left: 220, behavior: 'smooth' });
      }
    });
  }

  if (carouselPrev && similarList) {
    carouselPrev.addEventListener('click', () => {
      if (similarList.scrollLeft <= 0) {
        similarList.scrollTo({ left: similarList.scrollWidth, behavior: 'smooth' });
      } else {
        similarList.scrollBy({ left: -220, behavior: 'smooth' });
      }
    });
  }

  // Arrastre con mouse/táctil
  let isDown = false;
  let startPosX = 0;
  let scrollStart = 0;
  if (similarList) {
    similarList.addEventListener('mousedown', e => {
      isDown = true;
      startPosX = e.pageX - similarList.offsetLeft;
      scrollStart = similarList.scrollLeft;
    });
    similarList.addEventListener('mouseleave', () => isDown = false);
    similarList.addEventListener('mouseup', () => isDown = false);
    similarList.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - similarList.offsetLeft;
      const walk = (x - startPosX) * 1.2;
      similarList.scrollLeft = scrollStart - walk;
    });

    // táctil
    let touchStartX = 0;
    similarList.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].pageX;
    });
    similarList.addEventListener('touchmove', e => {
      const moveX = e.touches[0].pageX - touchStartX;
      similarList.scrollLeft -= moveX / 2;
      touchStartX = e.touches[0].pageX;
    });
  }

  // === TARJETAS DE PRODUCTOS ===
  const cards = document.querySelectorAll('.similar-card');
  cards.forEach(card => {
    const name = card.querySelector('h4').textContent;
    const priceText = card.querySelector('.price-sm').textContent;
    const img = card.querySelector('img').src;
    const price = parseFloat(priceText.replace(/[^\d.-]/g, '')) || 0;
    const product = { name, price, img, qty: 1 };

    // Click en la tarjeta (actualiza producto principal)
    card.addEventListener('click', e => {
      if (e.target.closest('.icon-cart')) return; // evita conflicto con botón del carrito
      updateMainProduct(product);
    });

    // Click en ícono del carrito (agrega al carrito)
    const btn = card.querySelector('.icon-cart');
    if (btn) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        addToCart(product);
      });
    }
  });

  // === BOTÓN PRINCIPAL DE PRODUCTO ===
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

  // === FAB (Floating Action Button) ===
  const fabMain = document.getElementById('fab-main');
  const fabContainer = document.querySelector('.fab-container');
  if (fabMain && fabContainer) {
    fabMain.addEventListener('click', e => {
      e.stopPropagation();
      setTimeout(() => fabContainer.classList.toggle('active'), 80);
    });
    document.addEventListener('click', e => {
      if (!fabContainer.contains(e.target) && !fabMain.contains(e.target)) {
        fabContainer.classList.remove('active');
      }
    });
  }
});
