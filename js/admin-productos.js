console.log("🧩 admin-productos.js — LISTADO PRODUCTOS");

/* ============================================================
   ESPERAR SUPABASE
============================================================ */
function esperarSupabase() {
  return new Promise(resolve => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve();
      }
    }, 80);
  });
}

/* ============================================================
   ELEMENTOS DOM
============================================================ */
const tbody = document.getElementById("products-body");
const mobileContainer = document.getElementById("products-mobile");
const searchInput = document.getElementById("search-products");
const productsCount = document.getElementById("products-count");
const btnAddProduct = document.getElementById("btnAddProduct");

/* ============================================================
   ESTADO
============================================================ */
let products = [];
let filteredProducts = [];

/* ============================================================
   HELPERS
============================================================ */
function formatPrice(value, currency = "HNL") {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency
  }).format(value);
}

function showSnackbar(message) {
  const bar = document.getElementById("snackbar");
  if (!bar) return;

  bar.textContent = message;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 3200);
}

/* ============================================================
   RENDER DESKTOP (TABLA)
============================================================ */
function renderTable(list) {
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:24px;">
          No hay productos
        </td>
      </tr>`;
    return;
  }

  list.forEach(p => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <img src="${p.image_url || "imagenes/no-image.png"}"
             alt="${p.name}"
             class="product-thumb">
      </td>
      <td>${p.name}</td>
      <td>${formatPrice(p.price, p.currency)}</td>
      <td>${p.stock}</td>
      <td>
        <span class="badge ${p.stock > 0 ? "ok" : "off"}">
          ${p.stock > 0 ? "Sí" : "No"}
        </span>
      </td>
      <td>
        <span class="badge ${p.stock > 0 ? "active" : "inactive"}">
          ${p.stock > 0 ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td class="actions">
        <button class="icon-btn" title="Editar">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="icon-btn danger" title="Eliminar">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ============================================================
   RENDER MÓVIL (CARDS)
============================================================ */
function renderMobile(list) {
  mobileContainer.innerHTML = "";

  if (!list.length) {
    mobileContainer.innerHTML = `
      <p style="text-align:center; opacity:.65;">
        No hay productos
      </p>`;
    return;
  }

  list.forEach(p => {
    const card = document.createElement("article");
    card.className = "product-card";

    card.innerHTML = `
      <img src="${p.image_url || "imagenes/no-image.png"}"
           alt="${p.name}">

      <div class="product-card-body">
        <h3>${p.name}</h3>
        <p class="price">${formatPrice(p.price, p.currency)}</p>

        <div class="meta">
          <span>Stock: ${p.stock}</span>
          <span class="status ${p.stock > 0 ? "active" : "inactive"}">
            ${p.stock > 0 ? "Activo" : "Inactivo"}
          </span>
        </div>

        <div class="actions">
          <button class="icon-btn">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="icon-btn danger">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;

    mobileContainer.appendChild(card);
  });
}

/* ============================================================
   FILTRAR
============================================================ */
function aplicarFiltro() {
  const q = searchInput.value.toLowerCase().trim();

  filteredProducts = !q
    ? [...products]
    : products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );

  renderTable(filteredProducts);
  renderMobile(filteredProducts);
  productsCount.textContent =
    `Mostrando ${filteredProducts.length} productos`;
}

/* ============================================================
   CARGAR PRODUCTOS
============================================================ */
async function cargarProductos() {
  const { data, error } = await window.supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando productos", error);
    showSnackbar("Error cargando productos");
    return;
  }

  products = data || [];
  filteredProducts = [...products];

  aplicarFiltro();
}

/* ============================================================
   EVENTOS
============================================================ */
searchInput.addEventListener("input", aplicarFiltro);

btnAddProduct.addEventListener("click", () => {
  window.location.href = "admin-agregar-producto.html";
});

/* ============================================================
   INIT
============================================================ */
(async function init() {
  await esperarSupabase();

  // Protección extra (auth-ui ya hace esto)
  if (localStorage.getItem("cortero_logged") !== "1") {
    window.location.href = "login.html";
    return;
  }

  cargarProductos();
})();
