/* ============================================================
   Carrito — Café Cortero 2025  
   SOLO LÓGICA DE CARRITO (SIN HEADER / SIN DRAWER)
============================================================ */

const CART_KEY = "cafecortero_cart";

/* -----------------------------------------------------------
   Helpers
----------------------------------------------------------- */
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

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

  if (!container) return;

  container.innerHTML = "";

  /* Contar cafés */
  const totalCafes = cart.reduce((sum, p) => sum + p.qty, 0);
  if (countItems) {
    countItems.textContent = `${totalCafes} ${totalCafes === 1 ? "café" : "cafés"}`;
  }

  /* ========= CARRITO VACÍO ========= */
  if (cart.length === 0) {
    if (main) main.classList.add("carrito-vacio-activo");

    if (topBack)     topBack.style.display = "none";
    if (topBackText) topBackText.style.display = "none";

    container.innerHTML = `
      <div class="empty-container">
        <div class="empty-title">Tu selección está vacía</div>
        <div class="empty-sub">Agrega tu café favorito para continuar.</div>
        <button class="empty-btn" onclick="location.href='index.html#productos'">
          Seguir comprando
        </button>
      </div>
    `;

    if (resumenBox) resumenBox.style.display = "none";
    if (subtotalLabel) subtotalLabel.textContent = "L 0.00";
    if (totalLabel)    totalLabel.textContent    = "L 0.00";
    return;
  }

  /* ========= HAY PRODUCTOS ========= */
  if (main) main.classList.remove("carrito-vacio-activo");
  if (topBack)     topBack.style.display = "flex";
  if (topBackText) topBackText.style.display = "inline-block";
  if (resumenBox)  resumenBox.style.display = "block";

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
   CONTROLES + / – / 🗑
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
    if (action === "del") cart.splice(index, 1);

    saveCart(cart);
    renderCart();
  });
}
/* -----------------------------------------------------------
   SINCRONIZAR HEADER CUANDO ESTÉ LISTO
----------------------------------------------------------- */
document.addEventListener("header:ready", () => {
  console.log("🧩 header listo → sincronizando carrito");

  // Actualiza badge del header
  if (typeof window.updateCartCount === "function") {
    window.updateCartCount();
  }

  // Actualiza texto "X cafés"
  renderCart();
});
/* -----------------------------------------------------------
   VALIDAR LOGIN PARA PROCEDER
----------------------------------------------------------- */
const procederBtn = document.getElementById("proceder-btn");
if (procederBtn) {
  procederBtn.addEventListener("click", async () => {
    const cart = getCart();
    if (cart.length === 0) return;

    const sb = getSupabaseClient();
    if (!sb) {
      location.href = "login.html?redirect=carrito";
      return;
    }

    const { data } = await sb.auth.getSession();
    if (!data?.session) {
      const snack = document.getElementById("snackbar-login");
      if (snack) {
        snack.classList.remove("hidden");
        snack.classList.add("show");
        setTimeout(() => {
          snack.classList.remove("show");
          snack.classList.add("hidden");
          location.href = "login.html?redirect=carrito";
        }, 1500);
      } else {
        location.href = "login.html?redirect=carrito";
      }
      return;
    }

    location.href = "datos_cliente.html";
  });
}

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
renderCart();
