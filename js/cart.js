/* ============================================================
   Carrito — Café Cortero 2025 (FINAL DEFINITIVO)
   ✔ Flujo correcto login → validaciones → checkout
   ✔ product_id validado SOLO cuando corresponde
   ✔ Flecha oculta cuando está vacío
   ✔ Snackbar login visible
   ✔ Contador del header controlado por header.js
   ✔ Compatible con recibo.js
============================================================ */

const CART_KEY = "cafecortero_cart";
const CHECKOUT_KEY = "checkout_cart";

/* ================= HELPERS ================= */
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

/* ================= HEADER COUNTER ================= */
/* 🔑 El header es el dueño del contador */
function syncHeaderCounter() {
  if (typeof window.updateHeaderCartCount === "function") {
    window.updateHeaderCartCount();
  }
}

/* ================= RENDER ================= */
function renderCart() {
  const cart = getCart();

  const container     = document.getElementById("cart-container");
  const subtotalLabel = document.getElementById("subtotal-label");
  const totalLabel    = document.getElementById("total-label");
  const resumenBox    = document.querySelector(".resumen-box");
  const main          = document.querySelector("main");

  if (!container) return;
  container.innerHTML = "";

  /* ================= CARRITO VACÍO ================= */
  if (!cart.length) {
    main?.classList.add("carrito-vacio-activo");
    document.body.classList.add("carrito-vacio");

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

    if (subtotalLabel) subtotalLabel.textContent = "L 0.00";
    if (totalLabel)    totalLabel.textContent    = "L 0.00";

    syncHeaderCounter();
    return;
  }

  /* ================= CON PRODUCTOS ================= */
  main?.classList.remove("carrito-vacio-activo");
  document.body.classList.remove("carrito-vacio");
  if (resumenBox) resumenBox.style.display = "block";

  const template = document.getElementById("template-cart-item");
  if (!template) return;

  let subtotal = 0;

  cart.forEach((item, index) => {
    const clone = template.content.cloneNode(true);

    clone.querySelector(".item-image").src = item.img || "";
    clone.querySelector(".item-name").textContent =
      item.name || "Producto";
    clone.querySelector(".item-price").textContent =
      `L ${Number(item.price).toFixed(2)} / unidad`;
    clone.querySelector(".qty-number").textContent =
      item.qty || 1;

    clone.querySelectorAll("button").forEach(btn => {
      btn.dataset.index = index;
    });

    subtotal += Number(item.qty || 0) * Number(item.price || 0);
    container.appendChild(clone);
  });

  if (subtotalLabel)
    subtotalLabel.textContent = `L ${subtotal.toFixed(2)}`;
  if (totalLabel)
    totalLabel.textContent    = `L ${subtotal.toFixed(2)}`;

  syncHeaderCounter();
}

/* ================= CONTROLES ================= */
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

/* ================= CHECKOUT ================= */
document.getElementById("proceder-btn")?.addEventListener("click", async () => {
  const cart = getCart();
  if (!cart.length) return;

  const sb = getSupabaseClient();
  if (!sb) {
    location.href = "login.html?redirect=carrito";
    return;
  }

  const { data } = await sb.auth.getSession();

  /* 🔐 NO LOGUEADO → SNACKBAR */
  if (!data?.session) {
    const snack = document.getElementById("snackbar-login");

    if (snack) {
      snack.classList.remove("hidden");
      snack.classList.add("show");

      setTimeout(() => {
        snack.classList.remove("show");
        snack.classList.add("hidden");
        location.href = "login.html?redirect=carrito";
      }, 1500);
    } else {
      location.href = "login.html?redirect=carrito";
    }
    return;
  }

  /* 🔒 VALIDAR product_id */
  const invalid = cart.some(p => !p.product_id);
  if (invalid) {
    alert("Algunos productos necesitan actualizarse. Vuelve a agregarlos 😊");
    return;
  }

  /* 📦 GUARDAR CHECKOUT */
  localStorage.setItem(CHECKOUT_KEY, JSON.stringify(cart));

  /* ➡️ CONTINUAR */
  location.href = "datos_cliente.html";
});

/* ================= INIT ================= */
renderCart();
syncHeaderCounter();
