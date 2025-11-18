/* ============================================================
   ======================  SUPABASE AUTH  ======================
   ============================================================ */
import { supabase } from "./supabase-client.js";
import { getCurrentUser, logoutUser } from "./supabase-auth.js";

/* ============================================================
   =====================  CARRITO BASE  ========================
   ============================================================ */

const CART_KEY = 'cafecortero_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
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

function animateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  badge.classList.remove('animate');
  void badge.offsetWidth;
  badge.classList.add('animate');
}

function animateCartIcon() {
  const cartBtn = document.getElementById('cart-btn');
  if (!cartBtn) return;
  cartBtn.classList.add('animate');
  setTimeout(() => cartBtn.classList.remove('animate'), 600);
  if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
}

function addToCart(product) {
  const cart = getCart();
  const index = cart.findIndex(p => p.name === product.name);

  if (index >= 0) cart[index].qty += product.qty;
  else cart.push(product);

  saveCart(cart);
  updateCartCount();
  animateCartBadge();
}

/* ============================================================
   ========================  MAIN UI  ==========================
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

  /* ============================================================
     ================  LOGIN STATUS (SUPABASE)  =================
     ============================================================ */

  const user = await getCurrentUser();

  const loginDesktop = document.getElementById("login-desktop");
  const profileDesktop = document.getElementById("profile-desktop");
  const helloDesktop = document.getElementById("hello-desktop");
  const profilePhotoDesktop = document.getElementById("profile-photo-desktop");

  const drawerDefault = document.getElementById("drawer-links-default");
  const drawerLogged = document.getElementById("drawer-links-logged");
  const helloMobile = document.getElementById("hello-mobile");
  const profilePhotoMobile = document.getElementById("profile-photo-mobile");

  const logoutDesktopBtn = document.getElementById("logout-desktop");
  const logoutMobileBtn = document.getElementById("logout-mobile");

  if (user) {
    // ================== MOSTRAR MENÚ LOGUEADO ==================
    if (loginDesktop) loginDesktop.style.display = "none";
    if (profileDesktop) profileDesktop.style.display = "flex";

    if (drawerDefault) drawerDefault.style.display = "none";
    if (drawerLogged) drawerLogged.style.display = "block";

    // ================== NOMBRE ==================
    const fullName = user.user_metadata?.full_name || "Usuario";
    if (helloDesktop) helloDesktop.textContent = `Hola, ${fullName}`;
    if (helloMobile) helloMobile.textContent = `Hola, ${fullName}`;

    // ================== FOTO PERFIL ==================
    const photo =
      user.user_metadata?.profile_photo ||
      "imagenes/avatar-default.svg";

    profilePhotoDesktop.src = photo;
    profilePhotoMobile.src = photo;

  } else {
    // ================== MODO SIN LOGIN ==================
    if (loginDesktop) loginDesktop.style.display = "inline-block";
    if (profileDesktop) profileDesktop.style.display = "none";

    if (drawerDefault) drawerDefault.style.display = "block";
    if (drawerLogged) drawerLogged.style.display = "none";
  }

  // ================== LOGOUT ==================

  if (logoutDesktopBtn) {
    logoutDesktopBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await logoutUser();
      window.location.reload();
    });
  }

  if (logoutMobileBtn) {
    logoutMobileBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await logoutUser();
      window.location.reload();
    });
  }

  /* ============================================================
     ================== MENÚ FLOTANTE (ESCRITORIO) ===============
     ============================================================ */

  const profileMenu = document.getElementById("profile-menu");
  const profileWrapper = document.getElementById("profile-desktop");

  if (profileWrapper) {
    profileWrapper.addEventListener("click", () => {
      profileMenu.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (!profileWrapper.contains(e.target)) {
        profileMenu.classList.remove("open");
      }
    });
  }

  /* ============================================================
     ======================= MENÚ MÓVIL ==========================
     ============================================================ */

  const menuToggle = document.getElementById("menu-toggle");
  const drawer = document.getElementById("drawer");

  if (menuToggle && drawer) {
    menuToggle.addEventListener("click", () => {
      drawer.classList.toggle("open");
    });
  }

  document.querySelectorAll(".drawer-links a").forEach(link => {
    link.addEventListener("click", () => drawer.classList.remove("open"));
  });

  /* ============================================================
     ======================= HERO CAROUSEL =======================
     ============================================================ */

  const heroImgs = document.querySelectorAll(".hero-carousel img");
  let heroIndex = 0;

  function showHeroImage(index) {
    heroImgs.forEach(img => img.classList.remove("active"));
    heroImgs[index].classList.add("active");
  }

  function nextHeroImage() {
    heroIndex = (heroIndex + 1) % heroImgs.length;
    showHeroImage(heroIndex);
  }

  if (heroImgs.length) {
    heroImgs[0].classList.add("active");
    setInterval(nextHeroImage, 8000);
  }

  /* ============================================================
     ======================= CARRITO =============================
     ============================================================ */

  const cartBtn = document.getElementById("cart-btn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });
  }
  updateCartCount();

  /* ============================================================
     ================= SELECTOR DE CANTIDAD ======================
     ============================================================ */

  const qtyNumber = document.getElementById("qty-number");
  const qtyMinus = document.getElementById("qty-minus");
  const qtyPlus = document.getElementById("qty-plus");

  if (qtyMinus) {
    qtyMinus.addEventListener("click", () => {
      let current = parseInt(qtyNumber.textContent);
      if (current > 1) qtyNumber.textContent = current - 1;
    });
  }

  if (qtyPlus) {
    qtyPlus.addEventListener("click", () => {
      let current = parseInt(qtyNumber.textContent);
      qtyNumber.textContent = current + 1;
    });
  }

  /* ============================================================
     ================= PRODUCTO PRINCIPAL ========================
     ============================================================ */

  const btnMain = document.getElementById("product-add");

  if (btnMain) {
    btnMain.addEventListener("click", () => {
      const qty = parseInt(document.getElementById("qty-number")?.textContent) || 1;
      const name = document.getElementById("product-name").textContent.trim();
      const price = parseFloat(
        document.querySelector(".price-part").textContent.replace(/[^\d.-]/g, "")
      );
      const img = document.getElementById("product-image").getAttribute("src");

      addToCart({ name, price, img, qty });

      document.getElementById("qty-number").textContent = "1";
    });
  }

  /* ============================================================
     ======================= CARRUSEL ============================
     ============================================================ */

  const cards = document.querySelectorAll(".similar-card");

  cards.forEach(card => {
    const name = card.dataset.name;
    const price = parseFloat(card.dataset.price.replace(/[^\d.-]/g, ""));
    const img = card.dataset.img;

    card.addEventListener("click", e => {
      document.querySelectorAll(".similar-card").forEach(c => c.classList.remove("active-card"));
      card.classList.add("active-card");

      document.getElementById("product-name").textContent = name;
      document.querySelector(".price-part").textContent = `L ${price}`;
      const imageEl = document.getElementById("product-image");
      imageEl.src = img;

      imageEl.style.opacity = "0";
      setTimeout(() => {
        imageEl.style.transition = "opacity 0.4s ease";
        imageEl.style.opacity = "1";
      }, 100);

      const productoSection = document.getElementById("productos");
      const offset = productoSection.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: offset, behavior: "smooth" });
    });
  });

  const carousel = document.querySelector(".similar-list");
  const prevBtn = document.querySelector(".carousel-prev");
  const nextBtn = document.querySelector(".carousel-next");

  if (carousel && prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      carousel.scrollBy({ left: -220, behavior: "smooth" });
    });
    nextBtn.addEventListener("click", () => {
      carousel.scrollBy({ left: 220, behavior: "smooth" });
    });
  }

  /* ============================================================
     ========================== FAB ==============================
     ============================================================ */

  const fabMain = document.getElementById("fab-main");
  const fabContainer = document.querySelector(".fab-container");

  if (fabMain && fabContainer) {
    fabMain.addEventListener("click", e => {
      e.stopPropagation();
      fabContainer.classList.toggle("active");
    });

    document.addEventListener("click", e => {
      if (!fabContainer.contains(e.target)) {
        fabContainer.classList.remove("active");
      }
    });
  }
});
