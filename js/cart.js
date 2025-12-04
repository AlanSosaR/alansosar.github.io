/* ============================================================
   Carrito — Versión Google Store 2025
============================================================ */

const CART_KEY  = "cafecortero_cart";
const SAVED_KEY = "cafecortero_saved";

/* Helpers */
const getCart  = () => JSON.parse(localStorage.getItem(CART_KEY))  || [];
const saveCart = cart => localStorage.setItem(CART_KEY, JSON.stringify(cart));

const getSaved  = () => JSON.parse(localStorage.getItem(SAVED_KEY)) || [];
const saveSaved = list => localStorage.setItem(SAVED_KEY, JSON.stringify(list));

/* Loader */
const showPageLoader = () => document.getElementById("page-loader")?.classList.remove("hidden");
const hidePageLoader = () => document.getElementById("page-loader")?.classList.add("hidden");

/* ============================================================
   RENDER DEL CARRITO
============================================================ */
function renderCart() {

  const cart          = getCart();
  const cartContainer = document.getElementById("cart-container");
  const colResumen    = document.querySelector(".col-resumen");
  const countSpan     = document.getElementById("count-items");

  cartContainer.innerHTML = "";
  colResumen.innerHTML    = "";

  /* contador */
  const total = cart.reduce((a,b) => a + b.qty, 0);
  countSpan.textContent = `(${total} ${total === 1 ? "café" : "cafés"})`;

  /* referencia tarjeta saved */
  const savedCard = document.querySelector("#saved-section .saved-card");

  /* ============================================================
       CARRITO VACÍO
  ============================================================ */
  if (cart.length === 0) {

    /* activar modo centrado */
    savedCard.classList.add("centered");

    cartContainer.innerHTML = `
      <div class="empty">
        Tu selección está vacía.<br>
        <small>Agrega tu café favorito para continuar.</small>
      </div>
    `;

    renderSaved();
    return;
  }

  /* carrito con productos → quitar centrado */
  savedCard.classList.remove("centered");

  /* ============================================================
       PINTAR PRODUCTOS
  ============================================================ */
  cart.forEach((item, index) => {

    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="item-img-box"><img src="${item.img}"></div>

      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-price">L ${item.price} / unidad</div>

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

    cartContainer.appendChild(div);
  });

  /* ============================================================
       RESUMEN
  ============================================================ */
  const subtotal = cart.reduce((acc, item) => acc + (item.qty * item.price), 0);

  colResumen.innerHTML = `
    <div class="resumen-box">
      <h2>Resumen del pedido</h2>

      <div class="resumen-row">
        <span>Total parcial</span>
        <span>L ${subtotal.toFixed(2)}</span>
      </div>

      <div class="resumen-row">
        <span>Envío</span>
        <span>L 0.00</span>
      </div>

      <div class="resumen-row resumen-total">
        <span>Total estimado</span>
        <span>L ${subtotal.toFixed(2)}</span>
      </div>

      <button id="proceder-btn" class="m3-btn">Proceder al pago</button>
    </div>
  `;

  saveCart(cart);
  renderSaved();
}

/* ============================================================
   GUARDADO PARA MÁS TARDE
============================================================ */
function renderSaved() {

  const saved     = getSaved();
  const container = document.getElementById("saved-list");
  const savedCard = document.querySelector("#saved-section .saved-card");

  container.innerHTML = "";

  /* vacío */
  if (saved.length === 0) {
    savedCard.classList.add("centered");

    container.classList.add("empty-saved");
    container.innerHTML = `
      <p class="saved-empty-title">No hay cafés guardados todavía</p>
      <p class="saved-empty-sub">Añade a esta lista tus cafés que no estás comprando hoy</p>
    `;
    return;
  }

  /* con productos → quitar centrado */
  savedCard.classList.remove("centered");
  container.classList.remove("empty-saved");

  /* render items */
  saved.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "saved-item";

    div.innerHTML = `
      <div class="saved-img-box"><img src="${item.img}"></div>

      <div class="saved-info">
        <div class="saved-name">${item.name}</div>
        <div class="saved-price">L ${item.price}</div>
      </div>

      <div class="saved-buttons">
        <button class="saved-btn return" data-action="return" data-index="${index}">Mover al carrito</button>
        <button class="saved-btn delete" data-action="delete-saved" data-index="${index}">Eliminar</button>
      </div>
    `;

    container.appendChild(div);
  });
}

/* ============================================================
   EVENTOS (carrito + guardados)
============================================================ */
document.addEventListener("click", e => {

  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const index  = parseInt(btn.dataset.index);

  /* -----------------------------
       ACCIONES DEL CARRITO
  ------------------------------*/
  if (["plus","minus","del","save"].includes(action)) {

    let cart = getCart();

    if (action === "plus") cart[index].qty++;
    if (action === "minus") {
      cart[index].qty--;
      if (cart[index].qty <= 0) cart.splice(index, 1);
    }
    if (action === "del") cart.splice(index, 1);

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
      }, 700);

      return;
    }

    saveCart(cart);
    renderCart();
  }

  /* -----------------------------
       ACCIONES EN GUARDADOS
  ------------------------------*/
  if (action === "return") {
    const saved = getSaved();
    const cart  = getCart();

    cart.push(saved[index]);
    saved.splice(index,1);

    saveCart(cart);
    saveSaved(saved);
    renderCart();
  }

  if (action === "delete-saved") {
    const saved = getSaved();
    saved.splice(index,1);
    saveSaved(saved);
    renderSaved();
  }
});

/* INIT */
renderCart();
