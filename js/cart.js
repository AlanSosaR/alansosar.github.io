/* ============================================================
   Carrito — Café Cortero 2025 (FINAL)
   ✔ Limpieza automática de productos inválidos
   ✔ product_id obligatorio SOLO para checkout
   ✔ Compatible con recibo.js
============================================================ */

const CART_KEY = "cafecortero_cart";

/* -----------------------------------------------------------
   HELPERS
----------------------------------------------------------- */
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

function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

/* -----------------------------------------------------------
   LIMPIAR PRODUCTOS INVÁLIDOS (AUTO)
----------------------------------------------------------- */
function sanitizeCart() {
  const cart = getCart();
  const valid = cart.filter(p =>
    p &&
    typeof p === "object" &&
    Number(p.qty) > 0 &&
    Number(p.price) > 0 &&
    p.name
  );

  if (valid.length !== cart.length) {
    console.warn("🧹 Carrito limpiado (productos antiguos o inválidos)");
    saveCart(valid);
  }
}

/* -----------------------------------------------------------
   RENDER DEL CARRITO
----------------------------------------------------------- */
function renderCart() {
  sanitizeCart();

  const cart = getCart();
  const container     = document.getElementById("cart-container");
  const subtotalLabel = document.getElementById("subtotal-label");
  const totalLabel    = document.getElementById("total-label");
  const countItems    = document.getElementById("count-items");
  const resumenBox    = document.querySelector(".resumen-box");
  const main          = document.querySelector("main");
  const topBack       = document.getElementById("top-back-btn");
  const topBackText   = document.getElementById("top-back-text");

  if (!container) return;
  container.innerHTML = "";

  const totalCafes = cart.reduce((s, p) => s + p.qty, 0);
  if (countItems) {
    countItems.textContent = `${totalCafes} ${totalCafes === 1 ? "café" : "cafés"}`;
  }

  /* ================= VACÍO ================= */
  if (!cart.length) {
    main?.classList.add("carrito-vacio-activo");
    if (topBack) topBack.style.display = "none";
    if (topBackText) topBackText.style.display = "none";
    if (resumenBox) resumenBox.style.display = "none";

    container.innerHTML = `
      <div class="empty-container">
        <div class="empty-title">Tu selección está vacía</div>
        <div class="empty-sub">Agrega tu café favorito para continuar.</div>
        <button class="empty-btn" onclick="location.href='index.html#productos'">
          Seguir comprando
        </button>
      </div>
    `;

    subtotalLabel.textContent = "L 0.00";
    totalLabel.textContent    = "L 0.00";
    return;
  }

  /* ================= CON PRODUCTOS ================= */
  main?.classList.remove("carrito-vacio-activo");
  if (topBack) topBack.style.display = "flex";
  if (topBackText) topBackText.style.display = "inline-block";
  if (resumenBox) resumenBox.style.display = "block";

  const template = document.getElementById("template-cart-item");
  if (!template) return;

  let subtotal = 0;

  cart.forEach((item, index) => {
    const clone = template.content.cloneNode(true);

    clone.querySelector(".item-image").src = item.img || "";
    clone.querySelector(".item-name").textContent = item.name;
    clone.querySelector(".item-price").textContent =
      `L ${item.price.toFixed(2)} / unidad`;
    clone.querySelector(".qty-number").textContent = item.qty;

    clone.querySelectorAll("button").forEach(btn => {
      btn.dataset.index = index;
    });

    subtotal += item.qty * item.price;
    container.appendChild(clone);
  });

  subtotalLabel.textContent = `L ${subtotal.toFixed(2)}`;
  totalLabel.textContent    = `L ${subtotal.toFixed(2)}`;
}

/* -----------------------------------------------------------
   CONTROLES + / – / 🗑
----------------------------------------------------------- */
document.getElementById("cart-container")?.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const index = Number(btn.dataset.index);
  const action = btn.dataset.action;
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

/* -----------------------------------------------------------
   PROCEDER AL PAGO
----------------------------------------------------------- */
document.getElementById("proceder-btn")?.addEventListener("click", async () => {
  const cart = getCart();
  if (!cart.length) return;

  // 🚨 VALIDACIÓN FINAL (SOLO AQUÍ)
  const invalid = cart.some(p => !p.product_id);
  if (invalid) {
    alert("Actualizamos el sistema. Vuelve a agregar tu café 😊");
    localStorage.removeItem(CART_KEY);
    location.reload();
    return;
  }

  const sb = getSupabaseClient();
  if (!sb) {
    location.href = "login.html?redirect=carrito";
    return;
  }

  const { data } = await sb.auth.getSession();
  if (!data?.session) {
    location.href = "login.html?redirect=carrito";
    return;
  }

  location.href = "datos_cliente.html";
});

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
renderCart();
