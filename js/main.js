/* ============================================================
   ======================  SUPABASE AUTH  ======================
   ============================================================ */

// Cliente global
const supabase = window.supabaseClient;

// Función obtener usuario actual
async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

// Función cerrar sesión
async function logoutUser() {
  await supabase.auth.signOut();
}

/* ============================================================
   ==========  ESCUCHAR CAMBIOS DE SESIÓN (NUEVO) =============
   ============================================================ */

supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    const uid = session.user.id;

    const { data: userRow } = await supabase
      .from("users")
      .select("*")
      .eq("id", uid)
      .single();

    actualizarMenuLogin(userRow);
  } else {
    actualizarMenuLogout();
  }
});

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
     ================  LOGIN STATUS INICIAL =====================
     ============================================================ */

  const user = await getCurrentUser();

  if (user) {
    const { data: row } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    actualizarMenuLogin(row);
  } else {
    actualizarMenuLogout();
  }

  /* ============================================================
     ================== LOGOUT ==================
     ============================================================ */

  const logoutDesktopBtn = document.getElementById("logout-desktop");
  const logoutMobileBtn = document.getElementById("logout-mobile");

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

/* ============================================================
   =========== FUNCIONES PARA CAMBIAR EL MENÚ ==================
   ============================================================ */

function actualizarMenuLogin(user) {
  // Desktop
  document.getElementById("login-desktop").style.display = "none";
  document.getElementById("profile-desktop").style.display = "flex";
  document.getElementById("hello-desktop").textContent = `Hola, ${user.name}`;
  document.getElementById("profile-photo-desktop").src = user.photo_url;

  // Móvil
  document.getElementById("drawer-links-default").style.display = "none";
  document.getElementById("drawer-links-logged").style.display = "block";
  document.getElementById("hello-mobile").textContent = `Hola, ${user.name}`;
  document.getElementById("profile-photo-mobile").src = user.photo_url;
}

function actualizarMenuLogout() {
  document.getElementById("login-desktop").style.display = "inline-block";
  document.getElementById("profile-desktop").style.display = "none";

  document.getElementById("drawer-links-default").style.display = "block";
  document.getElementById("drawer-links-logged").style.display = "none";
}
