/* ============================================================
   Carrito — Café Cortero
   Versión Final Premium 2025
   Login + Avatar dinámico + Menú
============================================================ */

const CART_KEY = 'cafecortero_cart';

/* -------------------------------------------
   Obtener y guardar carrito
------------------------------------------- */
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/* -------------------------------------------
   Render del carrito
------------------------------------------- */
function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cart-container');
  const totalBox = document.getElementById('total-box');
  const countItems = document.getElementById("count-items");

  container.innerHTML = '';

  let totalCafes = 0;
  cart.forEach(i => totalCafes += i.qty);
  countItems.textContent = `${totalCafes} ${totalCafes === 1 ? 'café' : 'cafés'}`;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty">
        Tu selección está vacía.<br>
        <small>Agrega tu café favorito para continuar.</small>
      </div>
    `;
    totalBox.style.display = "none";
    actualizarTextoBoton();
    return;
  }

  totalBox.style.display = "block";

  let total = 0;

  cart.forEach((item, index) => {
    const priceNum = parseFloat(item.price) || 0;
    const subtotal = priceNum * item.qty;
    total += subtotal;

    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div class="item-img-box">
        <img src="${item.img}">
      </div>

      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-price">L ${priceNum.toFixed(2)} / unidad</div>

        <div class="qty-controls">
          <button class="qty-btn minus" data-action="minus" data-index="${index}">
            <i class="fa-solid fa-minus"></i>
          </button>

          <span class="qty-number">${item.qty}</span>

          <button class="qty-btn plus" data-action="plus" data-index="${index}">
            <i class="fa-solid fa-plus"></i>
          </button>

          <button class="del-btn" data-action="del" data-index="${index}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  saveCart(cart);

  totalBox.innerHTML = `
    Total de tu selección: 
    <span class="moneda">L</span> ${total.toFixed(2)}
  `;

  actualizarTextoBoton();
}

/* -------------------------------------------
   Actualizar texto del botón
------------------------------------------- */
function actualizarTextoBoton() {
  const procederBtn = document.getElementById('proceder-btn');
  const cart = getCart();

  let totalCafes = 0;
  cart.forEach(item => totalCafes += item.qty);

  if (totalCafes === 0) {
    procederBtn.textContent = "Proceder al pago";
    return;
  }

  const palabra = totalCafes === 1 ? "café" : "cafés";
  procederBtn.textContent = `Proceder al pago (${totalCafes} ${palabra})`;
}

/* -------------------------------------------
   Eventos en items
------------------------------------------- */
document.getElementById('cart-container').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  const index = parseInt(btn.dataset.index);
  const cart = getCart();

  if (action === 'plus') cart[index].qty++;

  if (action === 'minus') {
    cart[index].qty--;
    if (cart[index].qty <= 0) cart.splice(index, 1);
  }

  if (action === 'del') cart.splice(index, 1);

  saveCart(cart);
  renderCart();
});

/* ============================================================
   Proceder al pago — Validación Login
============================================================ */
document.getElementById('proceder-btn').addEventListener('click', () => {
  const cart = getCart();

  /* Carrito vacío */
  if (cart.length === 0) {
    const aviso = document.getElementById('aviso-vacio');
    aviso.textContent = "Aún no has agregado cafés a tu selección.";
    aviso.classList.add('show');
    setTimeout(() => aviso.classList.remove('show'), 2500);
    return;
  }

  /* Validar login */
  const userRaw = localStorage.getItem("cortero_user");
  let user = null;

  try { user = JSON.parse(userRaw); } 
  catch { user = null; }

  if (!user) {
    const snack = document.getElementById("snackbar-login");
    snack.classList.add("show");

    setTimeout(() => {
      snack.classList.remove("show");
      window.location.href = "login.html?redirect=carrito";
    }, 1600);

    return;
  }

  /* Usuario logueado → continuar */
  window.location.href = "datos_cliente.html";
});

/* ============================================================
   AVATAR + MENÚ DINÁMICO
============================================================ */

const avatarBtn = document.getElementById("btn-header-user");
const avatarImg = document.getElementById("avatar-user");
const userMenu  = document.getElementById("user-menu");

/* Cargar avatar al iniciar */
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

  /* NO logueado → enviar a login */
  if (!user) {
    window.location.href = "login.html?redirect=carrito";
    return;
  }

  /* En PC: abrir menú */
  if (window.innerWidth > 768) {
    userMenu.classList.toggle("hidden");
    return;
  }

  /* En móvil: usar menú de auth-ui.js */
  if (typeof openMobileUserMenu === "function") {
    openMobileUserMenu();
  }
});

/* Init */
renderCart();
