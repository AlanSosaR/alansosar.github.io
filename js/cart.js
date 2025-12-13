/* ============================================================
   Carrito — Café Cortero 2025
   UI + lógica de carrito
   ❌ SIN logout aquí
============================================================ */

const CART_KEY = "cafecortero_cart";

/* ========================= HELPERS ========================= */
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

function getUserLS() {
  try {
    return JSON.parse(localStorage.getItem("cortero_user")) || null;
  } catch {
    return null;
  }
}

/* ========================= RENDER CARRITO ========================= */
function renderCart() {
  const cart = getCart();

  const container = document.getElementById("cart-container");
  const subtotalLabel = document.getElementById("subtotal-label");
  const totalLabel = document.getElementById("total-label");
  const countItems = document.getElementById("count-items");

  if (!container) return;
  container.innerHTML = "";

  let totalItems = cart.reduce((s, i) => s + i.qty, 0);
  if (countItems) {
    countItems.textContent = `${totalItems} ${totalItems === 1 ? "café" : "cafés"}`;
  }

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-container">
        <div class="empty-title">Tu selección está vacía</div>
        <div class="empty-sub">Agrega tu café favorito para continuar.</div>
        <button class="empty-btn" onclick="location.href='index.html'">
          Seguir comprando
        </button>
      </div>
    `;

    if (subtotalLabel) subtotalLabel.textContent = "L 0.00";
    if (totalLabel) totalLabel.textContent = "L 0.00";
    return;
  }

  const template = document.getElementById("template-cart-item");
  if (!template) return;

  let subtotal = 0;

  cart.forEach((item, index) => {
    const clone = template.content.cloneNode(true);

    clone.querySelector(".item-image").src = item.img;
    clone.querySelector(".item-name").textContent = item.name;
    clone.querySelector(".item-price").textContent = `L ${item.price}`;
    clone.querySelector(".qty-number").textContent = item.qty;

    clone.querySelectorAll("button").forEach(btn => {
      btn.dataset.index = index;
    });

    subtotal += item.qty * item.price;
    container.appendChild(clone);
  });

  if (subtotalLabel) subtotalLabel.textContent = `L ${subtotal.toFixed(2)}`;
  if (totalLabel) totalLabel.textContent = `L ${subtotal.toFixed(2)}`;
}

/* ========================= BOTONES + / - / 🗑 ========================= */
const cartContainer = document.getElementById("cart-container");
if (cartContainer) {
  cartContainer.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const index = parseInt(btn.dataset.index);
    const cart = getCart();

    if (!cart[index]) return;

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

/* ========================= VALIDAR LOGIN PARA PAGO ========================= */
const procederBtn = document.getElementById("proceder-btn");
if (procederBtn) {
  procederBtn.addEventListener("click", () => {
    const user = getUserLS();

    if (!user) {
      window.location.href = "login.html?redirect=carrito";
      return;
    }

    window.location.href = "datos_cliente.html";
  });
}

/* ========================= AVATAR + DRAWER (SOLO UI) ========================= */
document.addEventListener("DOMContentLoaded", () => {
  const avatarBtn = document.getElementById("btn-header-user");
  const drawer = document.getElementById("user-drawer");
  const scrim = document.getElementById("user-scrim");

  function openDrawer() {
    if (drawer && scrim) {
      drawer.classList.add("open");
      scrim.classList.add("open");
    }
  }

  function closeDrawer() {
    if (drawer && scrim) {
      drawer.classList.remove("open");
      scrim.classList.remove("open");
    }
  }

  if (avatarBtn) {
    avatarBtn.addEventListener("click", () => {
      if (!drawer) return;
      drawer.classList.contains("open") ? closeDrawer() : openDrawer();
    });
  }

  if (scrim) scrim.addEventListener("click", closeDrawer);
});

/* ========================= INIT ========================= */
renderCart();
