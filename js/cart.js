/* ============================================================
   Carrito — Versión Google Store 2025 (JS limpio y final)
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
   LOGIN — IGUAL QUE perfil.html
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
  const templateItem  = document.getElementById("template-cart-item");

  cartContainer.innerHTML = "";
  colResumen.innerHTML    = "";

  const total = cart.reduce((a,b) => a + b.qty, 0);
  countSpan.textContent = `(${total} ${total === 1 ? "café" : "cafés"})`;

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

  cart.forEach((item, index) => {
    const clone = templateItem.content.cloneNode(true);

    clone.querySelector(".item-image").src = item.img;
    clone.querySelector(".item-name").textContent  = item.name;
    clone.querySelector(".item-price").textContent = `L ${item.price} / unidad`;
    clone.querySelector(".qty-number").textContent = item.qty;

    clone.querySelectorAll("button").forEach(btn => {
      btn.dataset.index = index;
    });

    cartContainer.appendChild(clone);
  });

  const subtotal = cart.reduce((acc, i) => acc + (i.qty * i.price), 0);

  colResumen.innerHTML = `
    <div class="resumen-box">
      <h2>Resumen del pedido</h2>

      <div class="resumen-row">
        <span>Total parcial</span>
        <span>L ${subtotal.toFixed(2)}</span>
      </div>

      <div class="resumen-row">
        <span>Envío</span>
        <span<L 0.00</span>
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
  const saved        = getSaved();
  const container    = document.getElementById("saved-list");
  const templateSave = document.getElementById("template-saved-item");

  container.innerHTML = "";

  if (saved.length === 0) {
    container.innerHTML = `
      <p class="saved-empty-title">No hay cafés guardados todavía</p>
      <p class="saved-empty-sub">Añade a esta lista tus cafés que no estás comprando hoy</p>
    `;
    return;
  }

  saved.forEach((item, index) => {
    const clone = templateSave.content.cloneNode(true);

    clone.querySelector(".saved-image").src = item.img;
    clone.querySelector(".saved-name").textContent  = item.name;
    clone.querySelector(".saved-price").textContent = `L ${item.price}`;

    clone.querySelectorAll("button").forEach(btn => {
      btn.dataset.index = index;
    });

    container.appendChild(clone);
  });
}

/* ============================================================
   EVENTOS DEL CARRITO
============================================================ */
document.addEventListener("click", async e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const index  = parseInt(btn.dataset.index);

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

  if (btn.id === "proceder-btn") {
    const user = await checkLoginStatus();
    if (!user) return;
    window.location.href = "checkout.html";
  }
});

/* ============================================================
   🔥 BLOQUE NUEVO — MENÚ DEL AVATAR (MISMO QUE INDEX)
============================================================ */

const avatarBtn = document.getElementById("header-avatar-button");
const avatarImg = document.getElementById("header-profile-photo");

if (avatarBtn) {
  avatarBtn.addEventListener("click", async () => {

    const { data } = await supabase.auth.getUser();

    if (!data?.user) {
      window.location.href = "login.html?redirect=carrito";
      return;
    }

    // Escritorio
    if (window.innerWidth > 768) {
      if (typeof openUserMenu === "function") {
        openUserMenu();
      }
      return;
    }

    // Móvil
    if (typeof openMobileUserMenu === "function") {
      openMobileUserMenu();
    }
  });
}

/* Inicialización */
renderCart();
