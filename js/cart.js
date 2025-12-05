/* ============================================================  
   Carrito — Café Cortero 2025  
   Compatible con template + resumen lateral + login + avatar  
============================================================ */  

const CART_KEY = "cafecortero_cart";

/* -----------------------------------------------------------  
   Helpers para el carrito  
----------------------------------------------------------- */
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/* -----------------------------------------------------------  
   RENDER DEL CARRITO (USA EL TEMPLATE)  
----------------------------------------------------------- */
function renderCart() {
  const cart = getCart();

  const container = document.getElementById("cart-container");
  const subtotalLabel = document.getElementById("subtotal-label");
  const totalLabel = document.getElementById("total-label");
  const countItems = document.getElementById("count-items");
  const resumenBox = document.querySelector(".resumen-box");

  container.innerHTML = "";

  /* Contar cafés */
  let totalCafes = 0;
  cart.forEach(p => totalCafes += p.qty);
  countItems.textContent = `${totalCafes} ${totalCafes === 1 ? "café" : "cafés"}`;

  /* Carrito vacío */
  if (cart.length === 0) {

    container.innerHTML = `
      <div class="empty">
        Tu selección está vacía.<br>
        <small>Agrega tu café favorito para continuar.</small>
      </div>
    `;

    // 🔥 OCULTAR TARJETA DE RESUMEN COMPLETA
    resumenBox.style.display = "none";

    subtotalLabel.textContent = "L 0.00";
    totalLabel.textContent = "L 0.00";

    return;
  }

  // 🔥 SI HAY PRODUCTOS → MOSTRAR TARJETA DE RESUMEN
  resumenBox.style.display = "block";

  /* Render con template */
  const template = document.getElementById("template-cart-item");

  let subtotal = 0;

  cart.forEach((item, index) => {
    const clone = template.content.cloneNode(true);

    clone.querySelector(".item-image").src = item.img;
    clone.querySelector(".item-name").textContent = item.name;
    clone.querySelector(".item-price").textContent = `L ${item.price} / unidad`;
    clone.querySelector(".qty-number").textContent = item.qty;

    /* Conectar botones */
    clone.querySelectorAll("button").forEach(btn => {
      btn.dataset.index = index;
    });

    subtotal += item.qty * item.price;
    container.appendChild(clone);
  });

  /* Actualizar totales */
  subtotalLabel.textContent = `L ${subtotal.toFixed(2)}`;
  totalLabel.textContent = `L ${subtotal.toFixed(2)}`;

  saveCart(cart);
}

/* -----------------------------------------------------------  
   CONTROL DE BOTONES: +, –, 🗑  
----------------------------------------------------------- */
document.getElementById("cart-container").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const index = parseInt(btn.dataset.index);
  const cart = getCart();

  if (action === "plus") cart[index].qty++;

  if (action === "minus") {
    cart[index].qty--;
    if (cart[index].qty <= 0) cart.splice(index, 1);
  }

  if (action === "del") cart.splice(index, 1);

  saveCart(cart);
  renderCart();
});

/* -----------------------------------------------------------  
   VALIDAR LOGIN PARA PROCEDER AL PAGO  
----------------------------------------------------------- */
document.getElementById("proceder-btn").addEventListener("click", () => {
  const cart = getCart();

  if (cart.length === 0) return;

  let user = null;
  try { user = JSON.parse(localStorage.getItem("cortero_user")); }
  catch { user = null; }

  /* Usuario NO logueado */
  if (!user) {
    const snack = document.getElementById("snackbar-login");
    snack.textContent = "Necesitas iniciar sesión para continuar con tu pedido.";
    snack.classList.add("show");

    setTimeout(() => {
      snack.classList.remove("show");
      window.location.href = "login.html?redirect=carrito";
    }, 1500);

    return;
  }

  /* Usuario logueado → continuar */
  window.location.href = "datos_cliente.html";
});

/* -----------------------------------------------------------  
   AVATAR DINÁMICO + MENÚ  
----------------------------------------------------------- */
const avatarBtn = document.getElementById("btn-header-user");
const avatarImg = document.getElementById("avatar-user");
const userMenu = document.getElementById("user-menu");

/* Cargar avatar */
(function loadAvatar() {
  let user = null;
  try { user = JSON.parse(localStorage.getItem("cortero_user")); }
  catch { user = null; }

  if (user?.foto) {
    avatarImg.src = user.foto;
  } else {
    avatarImg.src = "imagenes/avatar-default.svg";
  }
})();

/* Click en avatar */
avatarBtn.addEventListener("click", () => {
  let user = null;
  try { user = JSON.parse(localStorage.getItem("cortero_user")); }
  catch { user = null; }

  if (!user) {
    window.location.href = "login.html?redirect=carrito";
    return;
  }

  // escritorio
  if (window.innerWidth > 768) {
    userMenu.classList.toggle("hidden");
    return;
  }

  // móvil
  if (typeof openMobileUserMenu === "function") {
    openMobileUserMenu();
  }
});

/* -----------------------------------------------------------  
   INIT  
----------------------------------------------------------- */
renderCart();
