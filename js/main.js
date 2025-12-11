/* ============================================================
   MAIN.JS — Café Cortero
   VERSIÓN DEFINITIVA UNIFICADA (Menú Material 3 + Carrito + Hero)
============================================================ */

/* ===================== FUNCIÓN SAFE ===================== */
function safe(id) {
  return document.getElementById(id);
}

/* ===================== CARRITO ===================== */

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

/* ===================== HELPERS MENÚ ===================== */

function getUserLS() {
  try {
    return JSON.parse(localStorage.getItem("cortero_user")) || null;
  } catch {
    return null;
  }
}

function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

/* ============================================================
   SISTEMA DE MENÚ MATERIAL 3 — MOSTRAR / OCULTAR SEGÚN SESIÓN
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

  const avatarBtn       = safe("btn-header-user");
  const avatarImg       = safe("avatar-user");
  const avatarDrawerImg = safe("avatar-user-drawer");

  const userDrawer = safe("user-drawer");
  const userScrim  = safe("user-scrim");
  const menuToggle = safe("menu-toggle");

  const logoutBtn = safe("logout-btn");

  const helloName  = safe("hello-desktop-cart");
  const drawerMail = safe("email-drawer-cart");

  const sb  = getSupabaseClient();
  const ls  = getUserLS();

  let session = null;

  /* ------------ OBTENER SESIÓN -------------- */
  if (sb) {
    try {
      const { data } = await sb.auth.getSession();
      session = data?.session || null;
    } catch (err) {
      console.error("Error obteniendo sesión:", err);
    }
  }

  /* ------------ ABRIR / CERRAR DRAWER -------------- */

  function openDrawer() {
    if (!userDrawer) return;
    userDrawer.classList.add("open");
    userScrim.classList.add("open");
  }

  function closeDrawer() {
    if (!userDrawer) return;
    userDrawer.classList.remove("open");
    userScrim.classList.remove("open");
  }

  userScrim.onclick = closeDrawer;

  document.addEventListener("click", (e) => {
    if (!userDrawer.contains(e.target) &&
        !avatarBtn?.contains(e.target) &&
        !menuToggle?.contains(e.target)) {
      closeDrawer();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  /* ============================================================
     MOSTRAR / OCULTAR MENÚ
  ============================================================ */

  function showLoggedMenu(user) {

    document.querySelectorAll(".no-user").forEach(el => {
      el.style.display = "none";
    });

    document.querySelectorAll(".logged").forEach(el => {
      el.style.display = "flex";
    });

    if (helloName) helloName.textContent = `Hola, ${user.name || "Usuario"}`;
    if (drawerMail) drawerMail.textContent = user.email;

    const photo = user.photo_url || "imagenes/avatar-default.svg";

    if (avatarImg) avatarImg.src = photo;
    if (avatarDrawerImg) avatarDrawerImg.src = photo;
  }

  function showGuestMenu() {

    document.querySelectorAll(".logged").forEach(el => {
      el.style.display = "none";
    });

    document.querySelectorAll(".no-user").forEach(el => {
      el.style.display = "flex";
    });

    if (helloName) helloName.textContent = "Hola, invitado";
    if (drawerMail) drawerMail.textContent = "Inicia sesión para continuar";

    if (avatarImg) avatarImg.src = "imagenes/avatar-default.svg";
    if (avatarDrawerImg) avatarDrawerImg.src = "imagenes/avatar-default.svg";
  }

  /* ============================================================
     ESTADO: LOGUEADO
  ============================================================ */

  if (session && ls) {
    showLoggedMenu(ls);

    if (avatarBtn) {
      avatarBtn.onclick = (e) => {
        e.stopPropagation();
        userDrawer.classList.contains("open") ? closeDrawer() : openDrawer();
      };
    }

    if (menuToggle) {
      menuToggle.onclick = (e) => {
        e.stopPropagation();
        userDrawer.classList.contains("open") ? closeDrawer() : openDrawer();
      };
    }

    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        try { if (sb) await sb.auth.signOut(); }
        catch (err) { console.error("Error al cerrar sesión:", err); }

        localStorage.removeItem("cortero_user");
        closeDrawer();
        location.reload();
      };
    }

  } else {

    /* ============================================================
       ESTADO: INVITADO
    ============================================================ */

    showGuestMenu();

    if (avatarBtn) {
      avatarBtn.onclick = (e) => {
        e.stopPropagation();
        userDrawer.classList.contains("open") ? closeDrawer() : openDrawer();
      };
    }

    if (menuToggle) {
      menuToggle.onclick = (e) => {
        e.stopPropagation();
        userDrawer.classList.contains("open") ? closeDrawer() : openDrawer();
      };
    }
  }

  /* ============================================================
     HERO CAROUSEL
  ============================================================ */

  const heroImgs = document.querySelectorAll(".hero-carousel img");
  let heroIndex = 0;

  const showHero = (i) => {
    heroImgs.forEach((img) => img.classList.remove("active"));
    if (heroImgs[i]) heroImgs[i].classList.add("active");
  };

  if (heroImgs.length > 0) {
    showHero(0);
    setInterval(() => {
      heroIndex = (heroIndex + 1) % heroImgs.length;
      showHero(heroIndex);
    }, 8000);
  }

  /* ============================================================
     BOTÓN DEL CARRITO
  ============================================================ */

  const cartBtn = safe("cart-btn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });
  }

  updateCartCount();

  /* ============================================================
     SELECTOR CANTIDAD PRODUCTO
  ============================================================ */

  const qtyNumber = safe("qty-number");
  const qtyMinus  = safe("qty-minus");
  const qtyPlus   = safe("qty-plus");

  if (qtyMinus && qtyNumber)
    qtyMinus.addEventListener("click", () => {
      let n = parseInt(qtyNumber.textContent);
      if (n > 1) qtyNumber.textContent = n - 1;
    });

  if (qtyPlus && qtyNumber)
    qtyPlus.addEventListener("click", () => {
      qtyNumber.textContent = parseInt(qtyNumber.textContent) + 1;
    });

  /* ============================================================
     BOTÓN AGREGAR AL CARRITO (PRODUCTO PRINCIPAL)
  ============================================================ */

  const btnMain = safe("product-add");

  if (btnMain && qtyNumber) {
    btnMain.addEventListener("click", () => {
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
    });
  }

  /* ============================================================
     CARRUSEL DE PRODUCTOS SIMILARES
  ============================================================ */

  const cards = document.querySelectorAll(".similar-card");

  if (cards.length > 0) {
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        cards.forEach((c) => c.classList.remove("active-card"));
        card.classList.add("active-card");

        const name = card.dataset.name;
        const price = parseFloat(card.dataset.price.replace(/[^\d.-]/g, ""));
        const img = card.dataset.img;

        const nameEl  = safe("product-name");
        const priceEl = document.querySelector(".price-part");
        const imageEl = safe("product-image");

        if (!nameEl || !priceEl || !imageEl) return;

        nameEl.textContent = name;
        priceEl.textContent = `L ${price}`;
        imageEl.src = img;

        imageEl.style.opacity = "0";
        setTimeout(() => {
          imageEl.style.transition = "opacity 0.4s ease";
          imageEl.style.opacity = "1";
        }, 80);
      });
    });
  }

  /* ============================================================
     CARRUSEL HORIZONTAL
  ============================================================ */

  const carousel = document.querySelector(".similar-list");
  const prevBtn  = document.querySelector(".carousel-prev");
  const nextBtn  = document.querySelector(".carousel-next");

  if (carousel && prevBtn && nextBtn) {
    prevBtn.onclick = () => carousel.scrollBy({ left: -220, behavior: "smooth" });
    nextBtn.onclick = () => carousel.scrollBy({ left:  220, behavior: "smooth" });
  }

  /* ============================================================
     FAB — FLOTANTE WHATSAPP
  ============================================================ */

  const fabMain      = safe("fab-main");
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
