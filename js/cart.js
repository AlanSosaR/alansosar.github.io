/* ============================================================
   Carrito — Versión Google Store 2025
   Café Cortero
============================================================ */

const CART_KEY = "cafecortero_cart";
const SAVED_KEY = "cafecortero_saved";

/* ============================================================
   Helpers
============================================================ */
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getSaved() {
  return JSON.parse(localStorage.getItem(SAVED_KEY)) || [];
}

function saveSaved(list) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
}

/* ============================================================
   Loader central
============================================================ */
function showPageLoader() {
  document.getElementById("page-loader").classList.remove("hidden");
}
function hidePageLoader() {
  document.getElementById("page-loader").classList.add("hidden");
}

/* ============================================================
   RENDER PRINCIPAL DEL CARRITO
============================================================ */
function renderCart() {
  const cart = getCart();

  const colProductos = document.querySelector(".col-productos");
  const colResumen = document.querySelector(".col-resumen");
  const countSpan = document.getElementById("count-items");

  colProductos.innerHTML = "";
  colResumen.innerHTML = "";

  /* ----------------------------
     CONTADOR HEADER
  ---------------------------- */
  const totalArticulos = cart.reduce((acc, item) => acc + item.qty, 0);
  const palabra = totalArticulos === 1 ? "café" : "cafés";
  countSpan.textContent = `(${totalArticulos} ${palabra})`;

  /* ----------------------------
     BLOQUE GUARDADO PARA MÁS TARDE
  ---------------------------- */
  const savedSection = document.getElementById("saved-section");
  const savedCard = savedSection.querySelector(".saved-card");

  /* 🟢 MODO B (carrito vacío) → centrado */
  if (cart.length === 0) {
    savedCard.classList.add("centered");

    colProductos.innerHTML = `
      <div class="empty">
        Tu selección está vacía.<br>
        <small>Agrega tu café favorito para continuar.</small>
      </div>
    `;
    colResumen.innerHTML = "";

    renderSaved();
    return;
  }

  /* 🟢 MODO A (carrito con productos) → alineado con tarjetas */
  savedCard.classList.remove("centered");

  /* ----------------------------
     RENDER PRODUCTOS
  ---------------------------- */
  cart.forEach((item, index) => {
    const priceNum = parseFloat(item.price) || 0;

    const div = document.createElement("div");
    div.className = "item";

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

          <button class="save-later-btn" data-action="save" data-index="${index}">
              <span class="save-later-text">Guardar para más tarde</span>
              <span class="save-later-loader"></span>
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
     RESUMEN
  ---------------------------- */
  const subtotal = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.qty), 0);
  const envio = 0;

  colResumen.innerHTML = `
    <div class="resumen-box">
      <h2>Resumen del pedido</h2>

      <div class="resumen-row">
        <span>Total parcial</span>
        <span>L ${subtotal.toFixed(2)}</span>
      </div>

      <div class="resumen-row">
        <span>Envío</span>
        <span>L ${envio.toFixed(2)}</span>
      </div>

      <div class="resumen-row resumen-total">
        <span>Total estimado</span>
        <span>L ${(subtotal + envio).toFixed(2)}</span>
      </div>

      <button id="proceder-btn" class="m3-btn">
        <span class="loader"></span>
        <span class="btn-text">Proceder al pago</span>
      </button>
    </div>
  `;

  saveCart(cart);
  renderSaved();
}

/* ============================================================
   RENDER GUARDADO PARA MÁS TARDE
============================================================ */
function renderSaved() {
  const saved = getSaved();
  const container = document.getElementById("saved-list");

  container.innerHTML = "";

  if (saved.length === 0) {
    container.classList.add("empty-saved");
    container.innerHTML = `
      <p class="saved-empty-title">No hay cafés guardados todavía</p>
      <p class="saved-empty-sub">Añade a esta lista tus cafés que no estás comprando hoy</p>
    `;
    return;
  }

  container.classList.remove("empty-saved");

  saved.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "saved-item";

    div.innerHTML = `
      <div class="saved-img-box">
        <img src="${item.img}">
      </div>

      <div class="saved-info">
        <div class="saved-name">${item.name}</div>
        <div class="saved-price">L ${item.price}</div>
      </div>

      <div class="saved-buttons">
        <button class="saved-btn return" data-action="return" data-index="${index}">
          Mover al carrito
        </button>
        <button class="saved-btn delete" data-action="delete-saved" data-index="${index}">
          Eliminar
        </button>
      </div>
    `;

    container.appendChild(div);
  });
}

/* ============================================================
   EVENTOS
============================================================ */
document.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const index = parseInt(btn.dataset.index);

  /* --- acciones del carrito --- */
  if (["plus", "minus", "del", "save"].includes(action)) {
    let cart = getCart();

    if (action === "plus") cart[index].qty++;

    if (action === "minus") {
      cart[index].qty--;
      if (cart[index].qty <= 0) cart.splice(index, 1);
    }

    if (action === "del") cart.splice(index, 1);

    /* GUARDAR PARA MÁS TARDE */
    if (action === "save") {
      const saved = getSaved();
      btn.classList.add("loading");

      showPageLoader();

      setTimeout(() => {
        saved.push(cart[index]);
        saveSaved(saved);

        cart.splice(index, 1);
        saveCart(cart);

        btn.classList.remove("loading");
        hidePageLoader();
        renderCart();
      }, 900);

      return;
    }

    saveCart(cart);
    renderCart();
  }

  /* --- acciones en guardados --- */
  if (action === "return") {
    const saved = getSaved();
    const cart = getCart();

    cart.push(saved[index]);
    saved.splice(index, 1);

    saveCart(cart);
    saveSaved(saved);
    renderCart();
  }

  if (action === "delete-saved") {
    const saved = getSaved();
    saved.splice(index, 1);
    saveSaved(saved);
    renderSaved();
  }
});

/* ============================================================
   PROCEDER AL PAGO
============================================================ */
document.addEventListener("click", e => {
  if (!e.target.closest("#proceder-btn")) return;

  const btn = document.getElementById("proceder-btn");
  const cart = getCart();

  const user = JSON.parse(localStorage.getItem("cortero_user"));
  const logged = localStorage.getItem("cortero_logged") === "1";

  if (cart.length === 0) return;

  if (!user || !logged) {
    const snack = document.getElementById("snackbar-login");
    snack.classList.add("show");

    setTimeout(() => {
      snack.classList.remove("show");
      window.location.href = "login.html";
    }, 2000);
    return;
  }

  btn.classList.add("loading");
  setTimeout(() => {
    window.location.href = "datos_cliente.html";
  }, 800);
});

/* ============================================================
   INIT
============================================================ */
renderCart();
