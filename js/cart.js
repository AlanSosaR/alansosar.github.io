/* ============================================================
   Carrito — Café Cortero 2025  
   Integrado con Supabase + Avatar del Index  
============================================================ */

const CART_KEY = "cafecortero_cart";

/* -----------------------------------------------------------
   Helpers del carrito
----------------------------------------------------------- */
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// Mismo helper que en perfil.js para leer el usuario
function getUserLS() {
  try {
    return JSON.parse(localStorage.getItem("cortero_user")) || null;
  } catch {
    return null;
  }
}

// Obtener cliente de Supabase de forma segura
function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

/* -----------------------------------------------------------
   RENDER DEL CARRITO + ESTADO VACÍO
----------------------------------------------------------- */
function renderCart() {
  const cart = getCart();

  const container     = document.getElementById("cart-container");
  const subtotalLabel = document.getElementById("subtotal-label");
  const totalLabel    = document.getElementById("total-label");
  const countItems    = document.getElementById("count-items");
  const resumenBox    = document.querySelector(".resumen-box");
  const main          = document.querySelector("main");
  const topBack       = document.getElementById("top-back-btn");
  const topBackText   = document.getElementById("top-back-text");
  const headerTitle   = document.getElementById("cart-title"); // texto del centro del header

  if (!container) return;

  container.innerHTML = "";

  /* Contar cafés */
  let totalCafes = cart.reduce((sum, p) => sum + p.qty, 0);
  if (countItems) {
    countItems.textContent = `${totalCafes} ${totalCafes === 1 ? "café" : "cafés"}`;
  }

  /* ========= ESTADO VACÍO ========= */
  if (cart.length === 0) {

    // Activar estilo vacío
    if (main) main.classList.add("carrito-vacio-activo");

    // Quitar flecha de arriba, texto "Seguir comprando" y título del header
    if (topBack)     topBack.style.display = "none";
    if (topBackText) topBackText.style.display = "none";
    if (headerTitle) headerTitle.style.display = "none";

    container.innerHTML = `
      <div class="empty-container">
          <div class="empty-title">Tu selección está vacía</div>
          <div class="empty-sub">Agrega tu café favorito para continuar.</div>

          <button class="empty-btn" onclick="window.location.href='index.html'">
              Seguir comprando
          </button>
      </div>
    `;

    if (resumenBox)   resumenBox.style.display = "none";
    if (subtotalLabel) subtotalLabel.textContent = "L 0.00";
    if (totalLabel)    totalLabel.textContent    = "L 0.00";

    return;
  }

  /* ========= HAY PRODUCTOS ========= */
  if (main) main.classList.remove("carrito-vacio-activo");

  // Mostrar flecha, texto "Seguir comprando" y título del header
  if (topBack)     topBack.style.display = "flex";
  if (topBackText) topBackText.style.display = "inline-block";
  if (headerTitle) headerTitle.style.display = "inline-block";

  if (resumenBox) resumenBox.style.display = "block";

  const template = document.getElementById("template-cart-item");
  if (!template) return;

  let subtotal = 0;

  cart.forEach((item, index) => {
    const clone = template.content.cloneNode(true);

    clone.querySelector(".item-image").src         = item.img;
    clone.querySelector(".item-name").textContent  = item.name;
    clone.querySelector(".item-price").textContent = `L ${item.price} / unidad`;
    clone.querySelector(".qty-number").textContent = item.qty;

    clone.querySelectorAll("button").forEach(btn => {
      btn.dataset.index = index;
    });

    subtotal += item.qty * item.price;
    container.appendChild(clone);
  });

  if (subtotalLabel) subtotalLabel.textContent = `L ${subtotal.toFixed(2)}`;
  if (totalLabel)    totalLabel.textContent    = `L ${subtotal.toFixed(2)}`;

  saveCart(cart);
}

/* -----------------------------------------------------------
   CONTROL BOTONES + / – / 🗑
----------------------------------------------------------- */
const cartContainer = document.getElementById("cart-container");
if (cartContainer) {
  cartContainer.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const index = parseInt(btn.dataset.index);
    const cart = getCart();

    if (isNaN(index) || !cart[index]) return;

    if (action === "plus") cart[index].qty++;
    if (action === "minus") {
      cart[index].qty--;
      if (cart[index].qty <= 0) cart.splice(index, 1);
    }
    if (action === "del") cart.splice(index, 1);

    saveCart(cart);
    renderCart();
  });
}

/* -----------------------------------------------------------
   VALIDAR LOGIN PARA PROCEDER AL PAGO (Supabase)
----------------------------------------------------------- */
const procederBtn = document.getElementById("proceder-btn");
if (procederBtn) {
  procederBtn.addEventListener("click", async () => {
    const cart = getCart();
    if (cart.length === 0) return;

    const sb = getSupabaseClient();
    if (!sb) {
      console.error("Supabase client no disponible en carrito (proceder)");
      window.location.href = "login.html?redirect=carrito";
      return;
    }

    let session = null;

    try {
      const { data, error } = await sb.auth.getSession();
      if (error) {
        console.error("Error obteniendo sesión:", error);
      }
      session = data && (data.session || null);
    } catch (err) {
      console.error("Excepción en getSession (proceder):", err);
    }

    // Si NO hay sesión → mostrar snackbar y mandar a login
    if (!session) {
      const snack = document.getElementById("snackbar-login");
      if (snack) {
        snack.textContent = "Necesitas iniciar sesión para continuar.";
        snack.classList.remove("hidden");
        snack.classList.add("show");

        setTimeout(() => {
          snack.classList.remove("show");
          snack.classList.add("hidden");
          window.location.href = "login.html?redirect=carrito";
        }, 1500);
      } else {
        window.location.href = "login.html?redirect=carrito";
      }
      return;
    }

    // Si SÍ hay sesión → ir a datos del cliente
    window.location.href = "datos_cliente.html";
  });
}

/* -----------------------------------------------------------
   AVATAR + MENÚ ESCRITORIO / MÓVIL
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {

  const avatarBtn    = document.getElementById("btn-header-user");
  const avatarImg    = document.getElementById("avatar-user");
  const userMenu     = document.getElementById("user-menu");
  const logoutBtn    = document.getElementById("logout-btn");

  // elementos del panel móvil
  const mobileMenu   = document.getElementById("mobile-user-menu");
  const mobileClose  = document.getElementById("mobile-user-close");
  const avatarMobile = document.getElementById("avatar-user-mobile");
  const logoutMobile = document.getElementById("logout-mobile");

  const helloDesktop = document.getElementById("hello-desktop-cart");
  const helloMobile  = document.getElementById("hello-mobile-cart");

  const userLS = getUserLS();   // JSON que guarda perfil.js
  const sb     = getSupabaseClient();
  let session  = null;

  if (!sb) {
    console.error("Supabase client no disponible en carrito (avatar)");
  } else {
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) {
        console.error("Error obteniendo sesión (avatar):", error);
      }
      session = data && (data.session || null);
    } catch (err) {
      console.error("Excepción en getSession (avatar):", err);
    }
  }

  // --------- NO LOGUEADO ----------
  if (!session || !userLS) {
      if (avatarImg)    avatarImg.src    = "imagenes/avatar-default.svg";
      if (avatarMobile) avatarMobile.src = "imagenes/avatar-default.svg";

      if (avatarBtn) {
        avatarBtn.onclick = () => {
          window.location.href = "login.html?redirect=carrito";
        };
      }

      return;
  }

  // --------- LOGUEADO ----------
  const displayName = userLS.name || userLS.email || "Usuario";

  if (helloDesktop) helloDesktop.textContent = `Hola, ${displayName}`;
  if (helloMobile)  helloMobile.textContent  = `Hola, ${displayName}`;

  // Foto desde localStorage
  if (avatarImg)    avatarImg.src    = userLS.photo_url || "imagenes/avatar-default.svg";
  if (avatarMobile) avatarMobile.src = userLS.photo_url || "imagenes/avatar-default.svg";

  // Refrescar foto desde la tabla "users"
  if (sb) {
    try {
      const { data: perfil, error } = await sb
          .from("users")
          .select("photo_url")
          .eq("id", userLS.id)
          .single();

      if (!error && perfil?.photo_url) {
        if (avatarImg)    avatarImg.src    = perfil.photo_url;
        if (avatarMobile) avatarMobile.src = perfil.photo_url;

        localStorage.setItem(
          "cortero_user",
          JSON.stringify({ ...userLS, photo_url: perfil.photo_url })
        );
      }
    } catch (err) {
      console.error("Error obteniendo perfil para avatar:", err);
    }
  }

  // Abrir: escritorio → menú flotante, móvil → panel lateral
  if (avatarBtn) {
    avatarBtn.onclick = () => {
      if (window.innerWidth > 768) {
        // escritorio
        userMenu?.classList.toggle("hidden");
      } else {
        // móvil
        if (mobileMenu) mobileMenu.classList.remove("hidden");
      }
    };
  }

  // Cerrar panel móvil
  if (mobileClose && mobileMenu) {
    mobileClose.onclick = () => {
      mobileMenu.classList.add("hidden");
    };
  }

  // Cerrar sesión (escritorio)
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      if (sb) await sb.auth.signOut();
      window.location.href = "index.html";
    };
  }

  // Cerrar sesión (móvil)
  if (logoutMobile) {
    logoutMobile.onclick = async () => {
      if (sb) await sb.auth.signOut();
      if (mobileMenu) mobileMenu.classList.add("hidden");
      window.location.href = "index.html";
    };
  }

  // Cerrar menú escritorio al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!userMenu || !avatarBtn) return;
    if (window.innerWidth <= 768) return; // solo aplica en escritorio
    if (!userMenu.classList.contains("hidden") &&
        !avatarBtn.contains(e.target) &&
        !userMenu.contains(e.target)) {
      userMenu.classList.add("hidden");
    }
  });
});

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
renderCart();
