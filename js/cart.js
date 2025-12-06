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
  const headerTitle   = document.getElementById("cart-title");

  if (!container) return;

  container.innerHTML = "";

  /* Contar cafés */
  const totalCafes = cart.reduce((sum, p) => sum + p.qty, 0);
  if (countItems) {
    countItems.textContent = `${totalCafes} ${totalCafes === 1 ? "café" : "cafés"}`;
  }

  /* ========= ESTADO VACÍO ========= */
  if (cart.length === 0) {
    if (main) main.classList.add("carrito-vacio-activo");

    // Ocultar navegación y título
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

    if (resumenBox)      resumenBox.style.display = "none";
    if (subtotalLabel)   subtotalLabel.textContent = "L 0.00";
    if (totalLabel)      totalLabel.textContent    = "L 0.00";

    return;
  }

  /* ========= HAY PRODUCTOS ========= */
  if (main) main.classList.remove("carrito-vacio-activo);

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
    const index  = parseInt(btn.dataset.index, 10);
    const cart   = getCart();

    if (isNaN(index) || !cart[index]) return;

    if (action === "plus")  cart[index].qty++;
    if (action === "minus") {
      cart[index].qty--;
      if (cart[index].qty <= 0) cart.splice(index, 1);
    }
    if (action === "del")   cart.splice(index, 1);

    saveCart(cart);
    renderCart();
  });
}

/* -----------------------------------------------------------
   BOTÓN PROCEDER AL PAGO
----------------------------------------------------------- */
const procederBtn = document.getElementById("proceder-btn");
if (procederBtn) {
  procederBtn.addEventListener("click", async () => {
    const cart = getCart();
    if (cart.length === 0) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const snack = document.getElementById("snackbar-login");
        if (snack) {
          snack.textContent = "Necesitas iniciar sesión para continuar.";
          snack.classList.add("show");
          setTimeout(() => {
            snack.classList.remove("show");
            window.location.href = "login.html?redirect=carrito";
          }, 1500);
        } else {
          window.location.href = "login.html?redirect=carrito";
        }
        return;
      }

      window.location.href = "datos_cliente.html";
    } catch (err) {
      console.error("Error comprobando sesión:", err);
      // fallback seguro
      window.location.href = "login.html?redirect=carrito";
    }
  });
}

/* -----------------------------------------------------------
   AVATAR: MISMO COMPORTAMIENTO QUE EN INDEX
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initAvatar();
});

async function initAvatar() {
  const avatarBtn = document.getElementById("btn-header-user");
  const avatarImg = document.getElementById("avatar-user");
  const userMenu  = document.getElementById("user-menu");
  const logoutBtn = document.getElementById("logout-btn");

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      if (avatarImg) avatarImg.src = "imagenes/avatar-default.svg";
      if (avatarBtn) {
        avatarBtn.onclick = () => {
          window.location.href = "login.html?redirect=carrito";
        };
      }
      return;
    }

    // Logueado
    const user = session.user;

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("foto")
      .eq("id", user.id)
      .single();

    if (avatarImg) {
      avatarImg.src = perfil?.foto || "imagenes/avatar-default.svg";
    }

    if (avatarBtn) {
      avatarBtn.onclick = () => {
        if (window.innerWidth > 768) {
          userMenu && userMenu.classList.toggle("hidden");
        } else if (typeof openMobileUserMenu === "function") {
          openMobileUserMenu();
        }
      };
    }

    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        await supabase.auth.signOut();
        window.location.href = "index.html";
      };
    }

    document.addEventListener("click", (e) => {
      if (!avatarBtn || !userMenu) return;
      if (!avatarBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.classList.add("hidden");
      }
    });
  } catch (err) {
    console.error("Error inicializando avatar:", err);
  }
}

/* -----------------------------------------------------------
   INIT: pintar carrito al cargar
----------------------------------------------------------- */
renderCart();
