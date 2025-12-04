/* ============================================================
   Carrito — Versión Google Store 2025 (JS limpio, sin HTML)
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

/* Snackbar */
function showSnackbar(message) {
  const bar = document.getElementById("snackbar-login");
  bar.textContent = message;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 2500);
}

/* ============================================================
   Login — Igual que perfil.html
============================================================ */
async function checkLoginStatus() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      showSnackbar("Necesitas iniciar sesión para continuar con tu pedido.");
      setTimeout(() => {
        window.location.href = "login.html?redirect=carrito";
      }, 1200);
      return null;
    }

    return data.user;

  } catch (err) {
    console.error("Error verificando login:", err);
    window.location.href = "login.html?redirect=carrito";
    return null;
  }
}

/* ============================================================
   RENDER DEL CARRITO
============================================================ */
function renderCart() {
  
  const cart          = getCart();
  const cartContainer = document.getElementById("cart-container");
  const colResumen    = document.getElementById("resumen-container");
  const countSpan     = document.getElementById("count-items");

  cartContainer.innerHTML = "";
  colResumen.innerHTML    = "";

  /* contador */
  const total = cart.reduce((a,b) => a + b.qty, 0);
  countSpan.textContent = `(${total} ${total === 1 ? "café" : "cafés"})`;

  /* Carrito vacío */
  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="empty">
        Tu selección está vacía.<br>
        <small>Agrega tu café favorito para continuar.</small>
      </div>
    `;
    renderSaved();
    return;
  }

  /* Pintar productos (HTML ya existe en archivo carrito.html) */
  cart.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item";

    row.innerHTML = `
      <div class="item-img-box"><img src="${item.img}" /></div>

      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-price">L ${item.price} / unidad</div>

        <div class="qty-controls">

          <!-- botones ya definidos por CSS -->
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

          <button class="save-later-btn" data-action="save" data-index="${index}">
            Guardar para más tarde
          </button>

        </div>
      </div>
    `;

    cartContainer.appendChild(row);
  });

  /* Resumen */
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

      <button id="proceder-btn">Proceder al pago</button>
    </div>
  `;

  saveCart(cart);
  renderSaved();
}

/* ============================================================
   RENDER GUARDADOS
============================================================ */
function renderSaved() {
  const saved     = getSaved();
  const container = document.getElementById("saved-list");

  container.innerHTML = "";

  if (saved.length === 0) {
    container.innerHTML = `
      <p class="saved-empty-title">No hay cafés guardados todavía</p>
      <p class="saved-empty-sub">Añade a esta lista tus cafés que no estás comprando hoy</p>
    `;
    return;
  }

  saved.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "saved-item";

    card.innerHTML = `
      <div class="saved-img-box"><img src="${item.img}" /></div>

      <div class="saved-info">
        <div class="saved-name">${item.name}</div>
        <div class="saved-price">L ${item.price}</div>
      </div>

      <div class="saved-buttons">
        <button class="saved-btn return" data-action="return" data-index="${index}">Mover al carrito</button>
        <button class="saved-btn delete" data-action="delete-saved" data-index="${index}">Eliminar</button>
      </div>
    `;

    container.appendChild(card);
  });
}

/* ============================================================
   EVENTOS
============================================================ */
document.addEventListener("click", async e => {

  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const index  = parseInt(btn.dataset.index);

  /* Control de cantidades */
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
      saved.push(cart[index]);
      saveSaved(saved);

      cart.splice(index, 1);
      saveCart(cart);

      renderCart();
      return;
    }

    saveCart(cart);
    renderCart();
  }

  /* Guardados */
  if (action === "return") {
    const saved = getSaved();
    const cart  = getCart();

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

  /* Proceder al pago */
  if (btn.id === "proceder-btn") {
    const user = await checkLoginStatus();
    if (!user) return;

    window.location.href = "checkout.html";
  }
});

/* INIT */
renderCart();
