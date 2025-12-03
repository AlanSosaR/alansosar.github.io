/* ============================================================
   CARRITO — Café Cortero (Versión Final 2025)
   Con sesión obligatoria antes de proceder al pago
   ============================================================ */

const CART_KEY = 'cafecortero_cart';

/* === Obtener carrito === */
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

/* === Guardar carrito === */
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/* === Render principal === */
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

/* === Texto dinámico del botón === */
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

/* ============================================================
   CONTROLES DE CANTIDAD, SUMA Y ELIMINACIÓN
   ============================================================ */

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
   FLUJO OFICIAL: PROCESAR PEDIDO → LOGIN O DATOS CLIENTE
   ============================================================ */

document.getElementById('proceder-btn').addEventListener('click', () => {
  const cart = getCart();
  const aviso = document.getElementById('aviso-vacio');

  /* 1️⃣ Si está vacío → aviso */
  if (cart.length === 0) {
    aviso.textContent = "Aún no has agregado cafés a tu selección.";
    aviso.classList.add('show');
    setTimeout(() => aviso.classList.remove('show'), 2500);
    return;
  }

  /* 2️⃣ Verificar si hay usuario logueado */
  const userRaw = localStorage.getItem("cortero_user");
  let user = null;

  try {
    user = JSON.parse(userRaw);
  } catch {
    user = null;
  }

  /* 3️⃣ No hay sesión → login */
  if (!user) {
    console.warn("⚠ Usuario no logueado → Redirigiendo a login.html");
    window.location.href = "login.html";
    return;
  }

  /* 4️⃣ Sesión válida → continuar a datos de entrega */
  console.log("✔ Usuario logueado → Redirigiendo a datos_cliente.html");
  window.location.href = "datos_cliente.html";
});

/* === Inicializar === */
renderCart();
