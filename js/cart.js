/* ============================================================
   Carrito — Café Cortero 2025 (ESTABLE Y FINAL)
   ✔ No borra productos al agregar
   ✔ product_id viaja oculto hasta recibo
   ✔ Validación SOLO en checkout
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
   RENDER DEL CARRITO
----------------------------------------------------------- */
function renderCart() {
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

  const totalCafes = cart.reduce((s, p) => s + (Number(p.qty) || 0), 0);
  if (countItems) {
    countItems.textContent = `${totalCafes} ${totalCafes === 1 ? "café" : "cafés"}`;
  }

  /* ================= VACÍO ================= */
  if (!cart.length) {
    main?.classList.add("carrito-vacio-activo");
    resumenBox && (resumenBox.style.display = "none");
    topBack && (topBack.style.display = "none");
    topBackText && (topBackText.style.display = "none");

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
  resumenBox && (resumenBox.style.display = "block");
  topBack && (topBack.style.display = "flex");
  topBackText && (topBackText.style.display = "inline-block");

  const template = document.getElementById("template-cart-item");
  if (!template) return;

  let subtotal = 0;

  cart.forEach((item, index) => {
    const clone = template.content.cloneNode(true);

    clone.querySelector(".item-image").src = item.img || "";
    clone.querySelector(".item-name").textContent = item.name || "Producto";
    clone.querySelector(".item-price").textContent =
      `L ${Number(item.price).toFixed(2)} / unidad`;
    clone.querySelector(".qty-number").textContent = item.qty || 1;

    clone.querySelectorAll("button").forEach(btn => {
      btn.dataset.index = index;
    });

    subtotal += (Number(item.qty) || 0) * (Number(item.price) || 0);
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

  const index  = Number(btn.dataset.index);
  const action = btn.dataset.action;
  const cart   = getCart();

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
   PROCEDER AL PAGO (VALIDACIÓN REAL)
----------------------------------------------------------- */
document.getElementById("proceder-btn")?.addEventListener("click", async () => {
  const cart = getCart();
  if (!cart.length) return;

  // 🔒 VALIDAR product_id SOLO AQUÍ
  const invalid = cart.some(p => !p.product_id);
  if (invalid) {
    alert("Uno o más productos necesitan actualizarse. Vuelve a agregarlos 😊");
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

  // 👉 EL CARRITO VIAJA OCULTO A RECIBO
  localStorage.setItem("checkout_cart", JSON.stringify(cart));

  location.href = "datos_cliente.html";
});

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
renderCart();
