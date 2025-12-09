/* ============================================================
   MAIN.JS — Café Cortero
   VERSIÓN OFICIAL 100% CORREGIDA — MENÚ MATERIAL 3 ÚNICO
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

/* ===================== HELPERS MENÚ (MEMORIA) ===================== */

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

/* ===================== EVENTO PRINCIPAL ===================== */

document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
     MENÚ MATERIAL 3 (PC + MÓVIL)
     Versión unificada que ya teníamos en memoria
     - Usa Supabase para sesión
     - Foto + nombre + correo
     - Logout
     - Avatar (PC) y hamburguesa (móvil) abren/cerran el drawer
  ============================================================ */

  (async () => {
    const avatarBtn        = safe("btn-header-user");
    const avatarImg        = safe("avatar-user");
    const avatarDrawerImg  = safe("avatar-user-drawer");

    const userDrawer       = safe("user-drawer");
    const userScrim        = safe("user-scrim");
    const logoutBtn        = safe("logout-btn");
    const menuToggle       = safe("menu-toggle");

    const helloDesktop     = safe("hello-desktop-cart");
    const emailDrawer      = safe("email-drawer-cart");

    const drawerLogged     = safe("drawer-links-logged");
    const drawerDefault    = safe("drawer-links-default");

    const userLS = getUserLS();
    const sb     = getSupabaseClient();

    let session = null;

    if (sb) {
      try {
        const { data, error } = await sb.auth.getSession();
        if (!error) {
          session = data.session;
        }
      } catch (err) {
        console.error("Error obteniendo sesión (menu):", err);
      }
    }

    function openUserDrawer() {
      if (!userDrawer || !userScrim) return;
      userDrawer.classList.add("open");
      userScrim.classList.add("open");
    }

    function closeUserDrawer() {
      if (!userDrawer || !userScrim) return;
      userDrawer.classList.remove("open");
      userScrim.classList.remove("open");
    }

    function showLoggedView() {
      if (drawerLogged)  drawerLogged.style.display  = "block";
      if (drawerDefault) drawerDefault.style.display = "none";
    }

    function showDefaultView() {
      if (drawerLogged)  drawerLogged.style.display  = "none";
      if (drawerDefault) drawerDefault.style.display = "block";
    }

    let drawerCloseHandlersAttached = false;

    function attachCommonCloseHandlers() {
      if (drawerCloseHandlersAttached) return;
      drawerCloseHandlersAttached = true;

      // Cerrar al tocar el scrim
      if (userScrim) {
        userScrim.onclick = () => {
          closeUserDrawer();
        };
      }

      // Cerrar con Escape
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeUserDrawer();
      });

      // Cerrar con click fuera
      document.addEventListener("click", (e) => {
        if (!userDrawer) return;
        const clickInsideDrawer  = userDrawer.contains(e.target);
        const clickOnAvatar      = avatarBtn && (e.target === avatarBtn || avatarBtn.contains(e.target));
        const clickOnMenuToggle  = menuToggle && (e.target === menuToggle || menuToggle.contains(e.target));

        if (!clickInsideDrawer && !clickOnAvatar && !clickOnMenuToggle) {
          closeUserDrawer();
        }
      });

      // Cerrar al cambiar tamaño de ventana
      window.addEventListener("resize", () => {
        closeUserDrawer();
      });
    }

    function attachInteractiveCloseOnClick() {
      if (!userDrawer) return;
      const interactiveEls = userDrawer.querySelectorAll(
        ".user-drawer-item, .user-drawer-profile-link"
      );
      interactiveEls.forEach((el) => {
        el.addEventListener("click", () => {
          closeUserDrawer();
        });
      });
    }

    /* --------- NO LOGUEADO ---------- */
    if (!session || !userLS) {
      // Vista por defecto: menú "invitado"
      showDefaultView();

      // Avatares por defecto (aunque el bloque logueado esté oculto)
      if (avatarImg)       avatarImg.src       = "imagenes/avatar-default.svg";
      if (avatarDrawerImg) avatarDrawerImg.src = "imagenes/avatar-default.svg";

      if (helloDesktop) helloDesktop.textContent = "Hola, invitado";
      if (emailDrawer)  emailDrawer.textContent  = "Inicia sesión para continuar";

      // Avatar (PC) → si existe, abre/cierra el drawer invitado
      if (avatarBtn) {
        avatarBtn.onclick = (e) => {
          e.stopPropagation();
          const isOpen = userDrawer && userDrawer.classList.contains("open");
          if (isOpen) closeUserDrawer();
          else openUserDrawer();
        };
      }

      // Hamburguesa (móvil) → abre/cierra el drawer invitado (NO redirige a login)
      if (menuToggle) {
        menuToggle.onclick = (e) => {
          e.stopPropagation();
          const isOpen = userDrawer && userDrawer.classList.contains("open");
          if (isOpen) closeUserDrawer();
          else openUserDrawer();
        };
      }

      // Handlers de cierre para el menú invitado
      attachCommonCloseHandlers();
      attachInteractiveCloseOnClick();

      // Empezar con el menú cerrado
      closeUserDrawer();
      return;
    }

    /* --------- LOGUEADO ---------- */

    // Vista logueado
    showLoggedView();

    const displayName = userLS.name || userLS.email || "Usuario";

    if (helloDesktop) helloDesktop.textContent = `Hola, ${displayName}`;
    if (emailDrawer)  emailDrawer.textContent  = userLS.email || "";

    const photo = userLS.photo_url || "imagenes/avatar-default.svg";
    if (avatarImg)       avatarImg.src       = photo;
    if (avatarDrawerImg) avatarDrawerImg.src = photo;

    if (sb) {
      try {
        const { data: perfil, error } = await sb
          .from("users")
          .select("photo_url")
          .eq("id", userLS.id)
          .single();

        if (!error && perfil?.photo_url) {
          if (avatarImg)       avatarImg.src       = perfil.photo_url;
          if (avatarDrawerImg) avatarDrawerImg.src = perfil.photo_url;

          localStorage.setItem(
            "cortero_user",
            JSON.stringify({ ...userLS, photo_url: perfil.photo_url })
          );
        }
      } catch (err) {
        console.error("Error obteniendo perfil para avatar:", err);
      }
    }

    // Avatar (PC) → abre/cierra drawer logueado
    if (avatarBtn) {
      avatarBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = userDrawer && userDrawer.classList.contains("open");
        if (isOpen) closeUserDrawer();
        else openUserDrawer();
      };
    }

    // Hamburguesa (móvil) → abre/cierra drawer logueado
    if (menuToggle) {
      menuToggle.onclick = (e) => {
        e.stopPropagation();
        const isOpen = userDrawer && userDrawer.classList.contains("open");
        if (isOpen) closeUserDrawer();
        else openUserDrawer();
      };
    }

    // Handlers de cierre para menú logueado
    attachCommonCloseHandlers();
    attachInteractiveCloseOnClick();

    // Logout
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        try {
          if (sb) await sb.auth.signOut();
        } catch (err) {
          console.error("Error al cerrar sesión:", err);
        }
        localStorage.removeItem("cortero_user");
        closeUserDrawer();
        window.location.href = "index.html";
      };
    }
  })();

  /* ============================================================
     RESTO DE LA LÓGICA (SIN CAMBIOS)
     ============================================================ */

  /* Hero carousel */
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

  /* Carrito */
  const cartBtn = safe("cart-btn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      window.location.href = "carrito.html";
    });
  }
  updateCartCount();

  /* Selector de cantidad */
  const qtyNumber = safe("qty-number");
  const qtyMinus = safe("qty-minus");
  const qtyPlus = safe("qty-plus");

  if (qtyMinus && qtyNumber)
    qtyMinus.addEventListener("click", () => {
      let n = parseInt(qtyNumber.textContent);
      if (n > 1) qtyNumber.textContent = n - 1;
    });

  if (qtyPlus && qtyNumber)
    qtyPlus.addEventListener("click", () => {
      let n = parseInt(qtyNumber.textContent);
      qtyNumber.textContent = n + 1;
    });

  /* Producto principal */
  const btnMain = safe("product-add");

  if (btnMain && qtyNumber) {
    btnMain.addEventListener("click", () => {
      const nameEl = safe("product-name");
      const imgEl = safe("product-image");
      const priceEl = document.querySelector(".price-part");

      if (!nameEl || !imgEl || !priceEl) return;

      const qty = parseInt(qtyNumber.textContent) || 1;
      const name = nameEl.textContent.trim();
      const price = parseFloat(priceEl.textContent.replace(/[^\d.-]/g, ""));
      const img = imgEl.src;

      addToCart({ name, price, img, qty });
      qtyNumber.textContent = "1";
    });
  }

  /* Carrusel productos similares */
  const cards = document.querySelectorAll(".similar-card");

  if (cards.length > 0) {
    cards.forEach((card) => {
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price.replace(/[^\d.-]/g, ""));
      const img = card.dataset.img;

      card.addEventListener("click", () => {
        document
          .querySelectorAll(".similar-card")
          .forEach((c) => c.classList.remove("active-card"));

        card.addEventListener("click", () => {
          cards.forEach((c) => c.classList.remove("active-card"));
          card.classList.add("active-card");

          const nameEl = safe("product-name");
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

          const sec = safe("productos");
          if (sec) {
            const offset = sec.getBoundingClientRect().top + window.scrollY - 90;
            window.scrollTo({ top: offset, behavior: "smooth" });
          }
        });
      });
    });
  }

  /* Carrusel horizontal */
  const carousel = document.querySelector(".similar-list");
  const prevBtn = document.querySelector(".carousel-prev");
  const nextBtn = document.querySelector(".carousel-next");

  if (carousel && prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () =>
      carousel.scrollBy({ left: -220, behavior: "smooth" })
    );
    nextBtn.addEventListener("click", () =>
      carousel.scrollBy({ left: 220, behavior: "smooth" })
    );
  }

  /* FAB — CORREGIDO */
  const fabMain = safe("fab-main");
  const fabContainer = safe("fab");

  if (fabMain && fabContainer) {
    fabMain.addEventListener("click", (e) => {
      e.stopPropagation();
      fabContainer.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!fabContainer.contains(e.target))
        fabContainer.classList.remove("active");
    });
  }
});
