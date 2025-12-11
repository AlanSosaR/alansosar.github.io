/* ============================================================
   MAIN.JS — Café Cortero 2025
   VERSIÓN FINAL UNIFICADA (Menú M3 + Carrito + Hero + Perfil PC/móvil)
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
   SISTEMA COMPLETO DE MENÚ + PERFIL (PC + MÓVIL)
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

  /* ---------- REFERENCIAS ---------- */

  const drawer          = safe("user-drawer");
  const scrim           = safe("user-scrim");
  const menuToggle      = safe("menu-toggle");

  const avatarBtn       = safe("btn-header-user");
  const avatarImg       = safe("avatar-user");
  const drawerAvatarImg = safe("avatar-user-drawer");

  const loginDesktop    = safe("login-desktop");
  const profileDesktop  = safe("profile-desktop");

  const logoutBtn       = safe("logout-btn");

  const drawerName      = safe("drawer-name");
  const drawerEmail     = safe("drawer-email");

  const sb     = getSupabaseClient();
  const userLS = getUserLS();
  let session  = null;


  /* ---------- SESIÓN SUPABASE ---------- */
  if (sb) {
    try {
      const { data } = await sb.auth.getSession();
      session = data?.session || null;
    } catch (err) {
      console.error("❌ Error obteniendo sesión:", err);
    }
  }


  /* ============================================================
     ABRIR / CERRAR DRAWER
  ============================================================ */
  function openDrawer() {
    drawer.classList.add("open");
    scrim.classList.add("open");
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    scrim.classList.remove("open");
  }

  if (scrim) scrim.onclick = closeDrawer;


  /* ============================================================
     INVITADO
  ============================================================ */
  function showGuest() {

    drawer.classList.remove("show-logged");
    drawer.classList.add("show-guest");

    if (drawerName)  drawerName.textContent  = "Hola, invitado";
    if (drawerEmail) drawerEmail.textContent = "Inicia sesión para continuar";

    if (avatarImg)       avatarImg.src       = "imagenes/avatar-default.svg";
    if (drawerAvatarImg) drawerAvatarImg.src = "imagenes/avatar-default.svg";

    if (loginDesktop)   loginDesktop.style.display = "block";
    if (profileDesktop) profileDesktop.style.display = "none";

    if (avatarBtn) {
      avatarBtn.onclick = () => window.location.href = "login.html";
    }
  }


  /* ============================================================
     LOGUEADO
  ============================================================ */
  async function showLogged(user) {

    drawer.classList.remove("show-guest");
    drawer.classList.add("show-logged");

    const name  = user.name || "Usuario";
    const email = user.email || "";
    const photo = user.photo_url || "imagenes/avatar-default.svg";

    if (drawerName)  drawerName.textContent  = `Hola, ${name}`;
    if (drawerEmail) drawerEmail.textContent = email;

    if (avatarImg)       avatarImg.src       = photo;
    if (drawerAvatarImg) drawerAvatarImg.src = photo;

    if (loginDesktop)   loginDesktop.style.display = "none";
    if (profileDesktop) profileDesktop.style.display = "flex";


    /* ========== REFRESCAR FOTO DESDE BD (igual que carrito.js) ========== */
    if (sb && user.id) {
      try {
        const { data: perfil } = await sb
          .from("users")
          .select("photo_url")
          .eq("id", user.id)
          .single();

        if (perfil?.photo_url) {
          avatarImg.src       = perfil.photo_url;
          drawerAvatarImg.src = perfil.photo_url;

          // actualizar localStorage
          localStorage.setItem(
            "cortero_user",
            JSON.stringify({ ...user, photo_url: perfil.photo_url })
          );
        }
      } catch (err) {
        console.error("❌ Error obteniendo foto:", err);
      }
    }


    /* ========== ABRIR/CERRAR DRAWER ========== */
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
  }


  /* ============================================================
     APLICAR ESTADO FINAL
  ============================================================ */
  if (session && userLS) {
    await showLogged(userLS);
  } else {
    showGuest();
  }


  /* ============================================================
     LOGOUT
  ============================================================ */
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        if (sb) await sb.auth.signOut();
      } catch (err) {
        console.error("Error logout:", err);
      }
      localStorage.removeItem("cortero_user");
      closeDrawer();
      window.location.reload();
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
     CARRITO
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
     AGREGAR AL CARRITO (PRODUCTO PRINCIPAL)
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

        safe("product-name").textContent = name;
        document.querySelector(".price-part").textContent = `L ${price}`;
        const imgEl = safe("product-image");

        imgEl.src = img;
        imgEl.style.opacity = "0";
        setTimeout(() => {
          imgEl.style.transition = "opacity .4s ease";
          imgEl.style.opacity = "1";
        }, 60);
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
    nextBtn.onclick = () => carousel.scrollBy({ left: 220,  behavior: "smooth" });
  }


  /* ============================================================
     FAB WHATSAPP
  ============================================================ */

  const fabMain = safe("fab-main");
  const fabContainer = safe("fab");

  if (fabMain) {
    fabMain.onclick = (e) => {
      e.stopPropagation();
      fabContainer.classList.toggle("active");
    };

    document.addEventListener("click", (e) => {
      if (!fabContainer.contains(e.target))
        fabContainer.classList.remove("active");
    });
  }

});  // DOMContentLoaded END
