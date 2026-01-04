console.log("🧩 admin-productos.js — FINAL SIN HTML");

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

const rowTemplate = document.getElementById("tpl-product-row");
const cardTemplate = document.getElementById("tpl-product-card");

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

function isActivo(p) {
  return p.status === "activo";
}

/* ============================================================
   RENDER DESKTOP
============================================================ */
function renderTable(list) {
  tbody.innerHTML = "";

  if (!list.length) {
    productsCount.textContent = "Mostrando 0 productos";
    return;
  }

  list.forEach(p => {
    const row = rowTemplate.content.cloneNode(true);

    const img = row.querySelector("img");
    img.src = p.image_url || "imagenes/no-image.png";
    img.onerror = () => img.src = "imagenes/no-image.png";
    img.alt = p.name;

    row.querySelector(".p-name").textContent = p.name;
    row.querySelector(".p-price").textContent = formatPrice(p.price, p.currency);
    row.querySelector(".p-stock").textContent = p.stock;

    const carousel = row.querySelector(".p-carousel");
    carousel.textContent = p.stock > 0 ? "Sí" : "No";
    carousel.className = `badge ${p.stock > 0 ? "ok" : "off"}`;

    const status = row.querySelector(".p-status");
    status.textContent = isActivo(p) ? "Activo" : "Inactivo";
    status.className = `badge ${isActivo(p) ? "active" : "inactive"}`;

    row.querySelector(".edit").dataset.id = p.id;
    row.querySelector(".delete").dataset.id = p.id;

    tbody.appendChild(row);
  });
}

/* ============================================================
   RENDER MÓVIL
============================================================ */
function renderMobile(list) {
  mobileContainer.innerHTML = "";

  if (!list.length) return;

  list.forEach(p => {
    const card = cardTemplate.content.cloneNode(true);

    const img = card.querySelector("img");
    img.src = p.image_url || "imagenes/no-image.png";
    img.onerror = () => img.src = "imagenes/no-image.png";
    img.alt = p.name;

    card.querySelector(".p-name").textContent = p.name;
    card.querySelector(".p-price").textContent = formatPrice(p.price, p.currency);

    const stock = card.querySelector(".p-stock");
    stock.innerHTML = `
      Stock: ${p.stock}
      <span class="status ${isActivo(p) ? "active" : "inactive"}">
        ${isActivo(p) ? "Activo" : "Inactivo"}
      </span>
    `;

    card.querySelector(".edit").dataset.id = p.id;
    card.querySelector(".delete").dataset.id = p.id;

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
    console.error(error);
    return;
  }

  products = data || [];
  aplicarFiltro();
}

/* ============================================================
   EVENTOS
============================================================ */
searchInput.addEventListener("input", aplicarFiltro);

btnAddProduct.addEventListener("click", () => {
  location.href = "admin-agregar-producto.html";
});

/* ============================================================
   INIT
============================================================ */
(async function init() {
  await esperarSupabase();

  if (localStorage.getItem("cortero_logged") !== "1") {
    location.href = "login.html";
    return;
  }

  cargarProductos();
})();
