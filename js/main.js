/* ============================================================
   MAIN.JS — Café Cortero
   VERSIÓN FINAL UNIFICADA (Menú M3 + Carrito + Hero + Lógica PC/móvil)
============================================================ */

/* ========================= SAFE ========================= */
function safe(id) {
  return document.getElementById(id);
}

/* ========================= CARRITO ========================= */

const CART_KEY = "cafecortero_cart";

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateCartCount() {
  const total = getCart().reduce((acc, item) => acc + item.qty, 0);
  const badge = safe("cart-count");
  if (badge) badge.textContent = total;
}

function animateCartBadge() {
  const badge = safe("cart-count");
  if (!badge) return;
  badge.classList.remove("animate");
  void badge.offsetWidth;
  badge.classList.add("animate");
}

function addToCart(product) {
  const cart = getCart();
  const index = cart.findIndex((p) => p.name === product.name);

  if (index >= 0) cart[index].qty += product.qty;
  else cart.push(product);

  saveCart(cart);
  updateCartCount();
  animateCartBadge();
}

/* ========================= UTIL: SESIÓN ========================= */

function getUserLS() {
  try {
    return JSON.parse(localStorage.getItem("cortero_user")) || null;
  } catch { return null; }
}

function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

/* ============================================================
   SISTEMA DE MENÚ MATERIAL 3 — PC + MÓVIL
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

  /* ---------- REFERENCIAS DOM ---------- */

  const drawer          = safe("user-drawer");
  const scrim           = safe("user-scrim");
  const menuToggle      = safe("menu-toggle");

  const avatarBtn       = safe("btn-header-user");
  const avatarImg       = safe("avatar-user");
  const drawerAvatarImg = safe("avatar-user-drawer");

  const loginDesktop    = safe("login-desktop");
  const profileDesktop  = safe("profile-desktop");

  const logoutBtn       = safe("logout-btn");

  const drawerName  = safe("drawer-name");
  const drawerEmail = safe("drawer-email");

  /* ---------- SESIÓN ---------- */

  const sb = getSupabaseClient();
  const ls = getUserLS();
  let session = null;

  if (sb) {
    try {
      const { data } = await sb.auth.getSession();
      session = data?.session || null;
    } catch (e) {
      console.error("Error sesión:", e);
    }
  }

  /* ---------- ABRIR / CERRAR DRAWER ---------- */

  function openDrawer() {
    drawer.classList.add("open");
    scrim.classList.add("open");
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    scrim.classList.remove("open");
  }

  scrim.onclick = closeDrawer;

  document.addEventListener("click", (e) => {
    if (!drawer.contains(e.target) &&
        !avatarBtn?.contains(e.target) &&
        !menuToggle?.contains(e.target)) {
      closeDrawer();
    }
  });

  /* ============================================================
     LÓGICA: INVITADO
  ============================================================ */
  function showGuest() {

    drawer.classList.add("no-user");

    // Ocultar sección perfil y botones privados
    document.querySelectorAll(".logged")
      .forEach(e => e.style.display = "none");

    // Mostrar opciones públicas
    document.querySelectorAll(".no-user")
      .forEach(e => e.style.display = "flex");

    // Drawer no muestra nombre/correo
    if (drawerName) drawerName.textContent = "";
    if (drawerEmail) drawerEmail.textContent = "";

    // PC → mostrar “Iniciar sesión"
    if (loginDesktop) loginDesktop.style.display = "block";
    if (profileDesktop) profileDesktop.style.display = "none";

    // PC → avatar NO aparece
    if (avatarBtn) avatarBtn.style.display = "none";
  }

  /* ============================================================
     LÓGICA: LOGUEADO
  ============================================================ */
  function showLogged(user) {

    drawer.classList.remove("no-user");

    // Mostrar elementos privados
    document.querySelectorAll(".logged")
      .forEach(e => e.style.display = "flex");

    // Ocultar opciones de invitado
    document.querySelectorAll(".no-user")
      .forEach(e => e.style.display = "none");

    const name  = user.name || "Usuario";
    const email = user.email || "";
    const photo = user.photo_url || "imagenes/avatar-default.svg";

    // Info perfil drawer
    if (drawerName) drawerName.textContent = `Hola, ${name}`;
    if (drawerEmail) drawerEmail.textContent = email;

    // Foto PC + Drawer
    if (avatarImg)       avatarImg.src = photo;
    if (drawerAvatarImg) drawerAvatarImg.src = photo;

    // PC → mostrar avatar
    if (loginDesktop)   loginDesktop.style.display = "none";
    if (profileDesktop) profileDesktop.style.display = "flex";

    if (avatarBtn) avatarBtn.style.display = "block";
  }

  /* ============================================================
     DEFINIR ESTADO SEGÚN SESIÓN
  ============================================================ */
  if (session && ls) {
    showLogged(ls);
  } else {
    showGuest();
  }

  /* ============================================================
     EVENTOS: ABRIR DRAWER
  ============================================================ */

  if (avatarBtn) {
    avatarBtn.onclick = (e) => {
      e.stopPropagation();
      drawer.classList.contains("open") ? closeDrawer() : openDrawer();
    };
  }

  if (menuToggle) {
    menuToggle.onclick = (e) => {
      e.stopPropagation();
      drawer.classList.contains("open") ? closeDrawer() : openDrawer();
    };
  }

  /* ---------- LOGOUT ---------- */
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        if (sb) await sb.auth.signOut();
      } catch (e) {}

      localStorage.removeItem("cortero_user");
      closeDrawer();
      location.reload();
    };
  }

  /* ============================================================
     HERO CAROUSEL
  ============================================================ */

  const heroImgs = document.querySelectorAll(".hero-carousel img");
  let heroIndex = 0;

  function showHero(i) {
    heroImgs.forEach(img => img.classList.remove("active"));
    if (heroImgs[i]) heroImgs[i].classList.add("active");
  }

  if (heroImgs.length > 0) {
    showHero(0);
    setInterval(() => {
      heroIndex = (heroIndex + 1) % heroImgs.length;
      showHero(heroIndex);
    }, 8000);
  }

  /* ============================================================
     BOTÓN CARRITO
  ============================================================ */

  const cartBtn = safe("cart-btn");
  if (cartBtn) {
    cartBtn.onclick = () => window.location.href = "carrito.html";
  }

  updateCartCount();

  /* ============================================================
     SELECTOR CANTIDAD
  ============================================================ */

  const qtyNumber = safe("qty-number");
  const qtyMinus  = safe("qty-minus");
  const qtyPlus   = safe("qty-plus");

  if (qtyMinus)
    qtyMinus.onclick = () => {
      let n = parseInt(qtyNumber.textContent);
      if (n > 1) qtyNumber.textContent = n - 1;
    };

  if (qtyPlus)
    qtyPlus.onclick = () => {
      qtyNumber.textContent = parseInt(qtyNumber.textContent) + 1;
    };

  /* ============================================================
     AGREGAR AL CARRITO — PRODUCTO PRINCIPAL
  ============================================================ */

  const btnMain = safe("product-add");

  if (btnMain) {
    btnMain.onclick = () => {

      const nameEl  = safe("product-name");
      const imgEl   = safe("product-image");
      const priceEl = document.querySelector(".price-part");

      if (!nameEl || !imgEl || !priceEl) return;

      const qty   = parseInt(qtyNumber.textContent) || 1;
      const name  = nameEl.textContent.trim();
      const price = parseFloat(priceEl.textContent.replace(/[^\d.-]/g, ""));
      const img   = imgEl.src;

      addToCart({ name, price, img, qty });
      qtyNumber.textContent = "1";
    };
  }

  /* ============================================================
     CARRUSEL SIMILARES
  ============================================================ */

  const cards = document.querySelectorAll(".similar-card");

  if (cards.length > 0) {
    cards.forEach(card => {
      card.onclick = () => {
        cards.forEach(c => c.classList.remove("active-card"));
        card.classList.add("active-card");

        const name  = card.dataset.name;
        const price = parseFloat(card.dataset.price.replace(/[^\d.-]/g, ""));
        const img   = card.dataset.img;

        const nameEl  = safe("product-name");
        const priceEl = document.querySelector(".price-part");
        const imgEl   = safe("product-image");

        if (!nameEl || !priceEl || !imgEl) return;

        nameEl.textContent = name;
        priceEl.textContent = `L ${price}`;
        imgEl.src = img;

        imgEl.style.opacity = "0";
        setTimeout(() => {
          imgEl.style.transition = "opacity .4s ease";
          imgEl.style.opacity = "1";
        }, 80);
      };
    });
  }

  /* ============================================================
     CARRUSEL FLECHAS
  ============================================================ */

  const carousel = document.querySelector(".similar-list");
  const prevBtn  = document.querySelector(".carousel-prev");
  const nextBtn  = document.querySelector(".carousel-next");

  if (carousel && prevBtn && nextBtn) {
    prevBtn.onclick = () => carousel.scrollBy({ left: -220, behavior: "smooth" });
    nextBtn.onclick = () => carousel.scrollBy({ left: 220, behavior: "smooth" });
  }

  /* ============================================================
     FAB WHATSAPP
  ============================================================ */

  const fabMain = safe("fab-main");
  const fabContainer = safe("fab");

  if (fabMain && fabContainer) {
    fabMain.onclick = (e) => {
      e.stopPropagation();
      fabContainer.classList.toggle("active");
    };

    document.addEventListener("click", (e) => {
      if (!fabContainer.contains(e.target))
        fabContainer.classList.remove("active");
    });
  }

});
