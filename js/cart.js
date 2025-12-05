/* ============================================================
   Carrito — Café Cortero
   Versión Final Premium 2025
   Con aviso suave (snackbar) si no está logueado
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

  container.innerHTML = '';

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
   Proceder al pago — con Snackbar Material 3 si no está logueado
============================================================ */
document.getElementById('proceder-btn').addEventListener('click', () => {
  const cart = getCart();
  const aviso = document.getElementById('aviso-vacio');

  /* 1️⃣ Carrito vacío */
  if (cart.length === 0) {
    aviso.textContent = "Aún no has agregado cafés a tu selección.";
    aviso.classList.add('show');
    setTimeout(() => aviso.classList.remove('show'), 2500);
    return;
  }

  /* 2️⃣ Verificar sesión */
  const userRaw = localStorage.getItem("cortero_user");
  let user = null;

  try { user = JSON.parse(userRaw); }
  catch { user = null; }

  /* 3️⃣ Usuario NO logueado → mostrar snackbar y redirigir */
  if (!user) {
    const snack = document.getElementById("snackbar-login");
    snack.classList.add("show");

    setTimeout(() => {
      snack.classList.remove("show");
      window.location.href = "login.html";
    }, 2200);

    return;
  }

  /* 4️⃣ Usuario logueado → continuar */
  window.location.href = "datos_cliente.html";
});

/* Init */
renderCart();
