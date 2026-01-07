/* ============================================================
   Carrito — Café Cortero 2025 (FINAL DEFINITIVO)
   ✔ Flujo correcto login → validaciones → checkout
   ✔ product_id validado SOLO cuando corresponde
   ✔ Flecha oculta cuando está vacío
   ✔ Snackbar login visible
   ✔ Contador del header controlado por header.js
   ✔ Título del carrito sincronizado (FIX)
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

/* ================= HEADER (BADGE) ================= */
/* 🔑 El header.js es el dueño del badge */
function syncHeaderCounter() {
  if (typeof window.updateHeaderCartCount === "function") {
    window.updateHeaderCartCount();
  }
}

/* ================= HEADER (TÍTULO) ================= */
/* 🔑 ESTE ERA EL FIX FALTANTE */
function updateHeaderCartTitle(cart) {
  const label = document.getElementById("count-items");
  if (!label) return;

  const total = cart.reduce((sum, i) => sum + Number(i.qty || 0), 0);
  label.textContent = `${total} ${total === 1 ? "café" : "cafés"}`;
}

/* ================= RENDER ================= */
function renderCart() {
  const cart = getCart();

  updateHeaderCartTitle(cart);   // ✅ ACTUALIZA “X cafés”

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
    clone.querySelector(".item-name").textContent = item.name || "Producto";
    clone.querySelector(".item-price").textContent =
      `L ${Number(item.price).toFixed(2)} / unidad`;
    clone.querySelector(".qty-number").textContent = item.qty || 1;

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

  const { data, error: sessionError } = await sb.auth.getSession();
  if (sessionError) {
    showSnackbar("No se pudo validar tu sesión. Intenta de nuevo.");
    return;
  }

  /* 🔐 NO LOGUEADO */
  if (!data?.session) {
    const snackLogin = document.getElementById("snackbar-login");

    if (snackLogin) {
      snackLogin.classList.remove("hidden");
      snackLogin.classList.add("show");

      setTimeout(() => {
        snackLogin.classList.remove("show");
        snackLogin.classList.add("hidden");
        location.href = "login.html?redirect=carrito";
      }, 1500);
    } else {
      location.href = "login.html?redirect=carrito";
    }
    return;
  }

  /* 🔐 BLOQUEAR ADMIN */
  const authUser = data.session.user;
  const authId = authUser.id;
  const authEmail = authUser.email;

  let userRow = null;

  const { data: byId, error: errById } = await sb
    .from("users")
    .select("rol")
    .eq("id", authId)
    .maybeSingle();

  if (errById) {
    showSnackbar("No se pudo validar tu cuenta.");
    return;
  }

  userRow = byId;

  if (!userRow && authEmail) {
    const { data: byEmail, error: errByEmail } = await sb
      .from("users")
      .select("rol")
      .eq("email", authEmail)
      .maybeSingle();

    if (errByEmail) {
      showSnackbar("No se pudo validar tu cuenta.");
      return;
    }

    userRow = byEmail;
  }

  if (!userRow) {
    showSnackbar("Tu usuario no está registrado.");
    return;
  }

  if (String(userRow.rol).toLowerCase() === "admin") {
    showSnackbar("Las cuentas de administrador no pueden realizar compras.");
    return;
  }

  /* 🔒 VALIDAR product_id */
  const invalid = cart.some(p => !p.product_id);
  if (invalid) {
    showSnackbar("Algunos productos necesitan actualizarse.");
    return;
  }

  /* 🔎 VALIDAR IDs EN SUPABASE */
  const ids = [...new Set(cart.map(i => String(i.product_id)))];

  const { data: products, error: productsError } = await sb
    .from("products")
    .select("id")
    .in("id", ids);

  if (productsError) {
    showSnackbar("No se pudo validar el carrito.");
    return;
  }

  const found = new Set((products || []).map(p => String(p.id)));
  const missing = ids.filter(id => !found.has(id));

  if (missing.length) {
    showSnackbar("Algunos productos ya no existen o cambiaron.");
    return;
  }

  /* 📦 GUARDAR CHECKOUT */
  localStorage.setItem(CHECKOUT_KEY, JSON.stringify(cart));

  /* ➡️ CONTINUAR */
  location.href = "datos_cliente.html";
});

/* ================= INIT ================= */

// Render inmediato (no depende del header)
renderCart();

// Cuando el header esté listo → sincronizar badge
document.addEventListener("header:ready", () => {
  syncHeaderCounter();
});
