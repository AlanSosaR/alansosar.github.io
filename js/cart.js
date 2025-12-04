/* ============================================================
   Carrito — Versión Google Store 2025
   Café Cortero
   Compatible con nuevo layout (header + grid + resumen)
============================================================ */

const CART_KEY = "cafecortero_cart";

/* ============================
   Obtener y guardar carrito
============================ */
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/* ============================================================
   Render principal del carrito (productos + resumen)
============================================================ */
function renderCart() {
  const cart = getCart();

  const colProductos = document.querySelector(".col-productos");
  const colResumen = document.querySelector(".col-resumen");
  const countSpan = document.getElementById("count-items");

  colProductos.innerHTML = "";
  colResumen.innerHTML = "";

  /* ----------------------------
     ACTUALIZAR CONTADOR ENCABEZADO
  ---------------------------- */
  const totalArticulos = cart.reduce((acc, item) => acc + item.qty, 0);
  const palabra = totalArticulos === 1 ? "café" : "cafés";
  countSpan.textContent = `(${totalArticulos} ${palabra})`;

  /* ----------------------------
     SI CARRITO VACÍO
  ---------------------------- */
  if (cart.length === 0) {
    colProductos.innerHTML = `
      <div class="empty">
        Tu selección está vacía.<br>
        <small>Agrega tu café favorito para continuar.</small>
      </div>
    `;

    colResumen.innerHTML = ""; // No mostrar resumen
    return;
  }

  /* ----------------------------
     RENDER DE PRODUCTOS
  ---------------------------- */
  cart.forEach((item, index) => {
    const priceNum = parseFloat(item.price) || 0;
    const subtotal = priceNum * item.qty;

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-img-box">
        <img src="${item.img}">
      </div>

      <div class="item-info">
        <div class="item-name">${item.name}</div>

        <div class="item-price">
          L ${priceNum.toFixed(2)} / unidad
        </div>

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

    colProductos.appendChild(div);
  });

  /* ----------------------------
     CÁLCULOS RESUMEN
  ---------------------------- */
  const subtotal = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.qty), 0);
  const envio = 0; // puedes cambiar luego
  const total = subtotal + envio;

  /* ----------------------------
     RENDER DEL RESUMEN
  ---------------------------- */
  colResumen.innerHTML = `
    <div class="resumen-box">

      <h2>Resumen del pedido</h2>

      <div class="row">
        <span>Total parcial</span>
        <span>L ${subtotal.toFixed(2)}</span>
      </div>

      <div class="row">
        <span>Envío</span>
        <span>L ${envio.toFixed(2)}</span>
      </div>

      <div class="row total">
        <span>Total estimado</span>
        <span>L ${total.toFixed(2)}</span>
      </div>

      <button id="proceder-btn" class="m3-btn">
        <span class="loader"></span>
        <span class="btn-text">Proceder al pago (${totalArticulos} ${palabra})</span>
      </button>

    </div>
  `;

  saveCart(cart);
}

/* ============================================================
   EVENTOS + / – / ELIMINAR
============================================================ */
document.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const index = parseInt(btn.dataset.index);

  if (action === undefined) return;

  let cart = getCart();

  if (action === "plus") {
    cart[index].qty++;
  }

  if (action === "minus") {
    cart[index].qty--;
    if (cart[index].qty <= 0) cart.splice(index, 1);
  }

  if (action === "del") {
    cart.splice(index, 1);
  }

  saveCart(cart);
  renderCart();
});

/* ============================================================
   PROCEDER AL PAGO — VALIDACIÓN + LOADER
============================================================ */
document.addEventListener("click", e => {
  if (!e.target.closest("#proceder-btn")) return;

  const btn = document.getElementById("proceder-btn");
  const cart = getCart();

  let user = null;
  let logged = false;

  try {
    user = JSON.parse(localStorage.getItem("cortero_user"));
    logged = localStorage.getItem("cortero_logged") === "1";
  } catch {
    user = null;
    logged = false;
  }

  const noSesion = (!user || !logged);

  /* Carrito vacío */
  if (cart.length === 0) {
    const aviso = document.getElementById("aviso-vacio");
    aviso.textContent = "Tu carrito está vacío.";
    aviso.classList.add("show");
    setTimeout(() => aviso.classList.remove("show"), 2500);
    return;
  }

  /* Sin sesión */
  if (noSesion) {
    const snack = document.getElementById("snackbar-login");
    snack.classList.add("show");

    setTimeout(() => {
      snack.classList.remove("show");
      window.location.href = "login.html";
    }, 2000);

    return;
  }

  /* OK → loader */
  btn.classList.add("loading");

  setTimeout(() => {
    window.location.href = "datos_cliente.html";
  }, 800);
});

/* ============================
   INIT
============================ */
renderCart();
