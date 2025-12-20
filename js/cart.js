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

          <button class="empty-btn" onclick="window.location.href='index.html#productos'">
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
   AVATAR + NUEVO MENÚ FLOTANTE (Drawer Material 3)
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {

  const avatarBtn        = document.getElementById("btn-header-user");
  const avatarImg        = document.getElementById("avatar-user");
  const avatarDrawerImg  = document.getElementById("avatar-user-drawer");

  const userDrawer       = document.getElementById("user-drawer");
  const userScrim        = document.getElementById("user-scrim");
  const logoutBtn        = document.getElementById("logout-btn");

  const helloDesktop     = document.getElementById("hello-desktop-cart");
  const emailDrawer      = document.getElementById("email-drawer-cart");

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

  // helpers para abrir/cerrar el drawer
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

  // --------- NO LOGUEADO ----------
  if (!session || !userLS) {
    if (avatarImg)        avatarImg.src        = "imagenes/avatar-default.svg";
    if (avatarDrawerImg)  avatarDrawerImg.src  = "imagenes/avatar-default.svg";
    if (helloDesktop)     helloDesktop.textContent = "invitado";
    if (emailDrawer)      emailDrawer.textContent  = "Inicia sesión para continuar";

    if (avatarBtn) {
      avatarBtn.onclick = () => {
        window.location.href = "login.html?redirect=carrito";
      };
    }

    // asegurar drawer cerrado
    closeUserDrawer();
    return;
  }

  // --------- LOGUEADO ----------
  const displayName = userLS.name || userLS.email || "Usuario";

  if (helloDesktop) helloDesktop.textContent = `${displayName}`;
  if (emailDrawer)  emailDrawer.textContent  = userLS.email || "";

  // Foto desde localStorage
  const photo = userLS.photo_url || "imagenes/avatar-default.svg";
  if (avatarImg)       avatarImg.src       = photo;
  if (avatarDrawerImg) avatarDrawerImg.src = photo;

  // Refrescar foto desde la tabla "users"
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

  // Abrir/cerrar drawer al hacer clic en el avatar (PC + móvil)
  if (avatarBtn) {
    avatarBtn.onclick = () => {
      if (!userDrawer) return;
      const isOpen = userDrawer.classList.contains("open");
      if (isOpen) {
        closeUserDrawer();
      } else {
        openUserDrawer();
      }
    };
  }

  // Cerrar al tocar el scrim
  if (userScrim) {
    userScrim.onclick = closeUserDrawer;
  }

  // Cerrar con Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeUserDrawer();
  });

  // Cerrar sesión
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
});

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
renderCart();
