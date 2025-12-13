/* ============================================================
   MAIN.JS — Café Cortero 2025 (CORREGIDO Y UNIFICADO)
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
  const index = cart.findIndex(p => p.name === product.name);

  if (index >= 0) cart[index].qty += product.qty;
  else cart.push(product);

  saveCart(cart);
  updateCartCount();
  animateCartBadge();
}

/* ========================= SUPABASE ========================= */

function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

/* ============================================================
   SISTEMA DE MENÚ + AUTH (PC + MÓVIL)
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
  const logoutBtn       = safe("logout-btn");

  const drawerName      = safe("drawer-name");
  const drawerEmail     = safe("drawer-email");

  const sb              = getSupabaseClient();

  /* ============================================================
     ABRIR / CERRAR DRAWER
  ============================================================ */
  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add("open");
    scrim?.classList.add("open");
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("open");
    scrim?.classList.remove("open");
  }

  if (scrim) scrim.onclick = closeDrawer;

  /* ============================================================
     ESTADO INVITADO
  ============================================================ */
  function showGuest() {

    // Ocultar todo lo de logueado
    document.querySelectorAll(".logged").forEach(el => {
      el.style.display = "none";
    });

    // Mostrar todo lo de invitado
    document.querySelectorAll(".no-user").forEach(el => {
      el.style.display = "";
    });

    // Header PC
    if (loginDesktop) loginDesktop.style.display = "block";
    if (avatarBtn) avatarBtn.style.display = "none";

    // Drawer info
    if (drawerName)  drawerName.textContent  = "Hola, invitado";
    if (drawerEmail) drawerEmail.textContent = "Inicia sesión para continuar";
    if (drawerAvatarImg) drawerAvatarImg.src = "imagenes/avatar-default.svg";

    // Hamburguesa abre drawer
    if (menuToggle) {
      menuToggle.onclick = (e) => {
        e.stopPropagation();
        openDrawer();
      };
    }
  }

  /* ============================================================
     ESTADO LOGUEADO
  ============================================================ */
  async function showLogged(sbUser) {

    // Mostrar logueado / ocultar invitado
    document.querySelectorAll(".logged").forEach(el => {
      el.style.display = "";
    });

    document.querySelectorAll(".no-user").forEach(el => {
      el.style.display = "none";
    });

    const name  = "Usuario";
    const email = sbUser.email || "";
    let photo   = "imagenes/avatar-default.svg";

    // Drawer info
    if (drawerName)  drawerName.textContent  = `Hola, ${name}`;
    if (drawerEmail) drawerEmail.textContent = email;

    // Header PC
    if (loginDesktop) loginDesktop.style.display = "none";
    if (avatarBtn) {
      avatarBtn.style.display = "flex";
      avatarImg.src = photo;

      avatarBtn.onclick = (e) => {
        e.stopPropagation();
        drawer.classList.contains("open") ? closeDrawer() : openDrawer();
      };
    }

    // Hamburguesa móvil
    if (menuToggle) {
      menuToggle.onclick = (e) => {
        e.stopPropagation();
        drawer.classList.contains("open") ? closeDrawer() : openDrawer();
      };
    }

    // Cargar foto real desde DB (opcional)
    if (sb && sbUser.id) {
      try {
        const { data: perfil } = await sb
          .from("users")
          .select("photo_url")
          .eq("id", sbUser.id)
          .single();

        if (perfil?.photo_url) {
          photo = perfil.photo_url;
          avatarImg.src = photo;
          drawerAvatarImg.src = photo;
        }
      } catch (err) {
        console.warn("Foto no disponible");
      }
    }
  }

  /* ============================================================
     APLICAR ESTADO REAL (ÚNICA FUENTE: SUPABASE)
  ============================================================ */
  if (sb) {
    try {
      const { data } = await sb.auth.getSession();
      const session = data?.session || null;

      if (session?.user) {
        await showLogged(session.user);
      } else {
        showGuest();
      }
    } catch (err) {
      console.error("Error sesión:", err);
      showGuest();
    }
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
      } catch {}
      closeDrawer();
      location.reload();
    };
  }

  /* ============================================================
     HERO CAROUSEL
  ============================================================ */
  const heroImgs = document.querySelectorAll(".hero-carousel img");
  let heroIndex = 0;

  if (heroImgs.length > 0) {
    heroImgs[0].classList.add("active");
    setInterval(() => {
      heroImgs.forEach(img => img.classList.remove("active"));
      heroIndex = (heroIndex + 1) % heroImgs.length;
      heroImgs[heroIndex].classList.add("active");
    }, 8000);
  }

  /* ============================================================
     CARRITO
  ============================================================ */
  const cartBtn = safe("cart-btn");
  if (cartBtn) cartBtn.onclick = () => location.href = "carrito.html";
  updateCartCount();

  /* ============================================================
     SELECTOR CANTIDAD
  ============================================================ */
  const qtyNumber = safe("qty-number");
  const qtyMinus  = safe("qty-minus");
  const qtyPlus   = safe("qty-plus");

  if (qtyMinus)
    qtyMinus.onclick = () => {
      const n = parseInt(qtyNumber.textContent);
      if (n > 1) qtyNumber.textContent = n - 1;
    };

  if (qtyPlus)
    qtyPlus.onclick = () => {
      qtyNumber.textContent = parseInt(qtyNumber.textContent) + 1;
    };

  /* ============================================================
     AGREGAR AL CARRITO
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

});
