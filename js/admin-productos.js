console.log("🧩 admin-productos.js — FINAL CORREGIDO (SWITCH + TEXTO + BD)");

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

function isActivo(product) {
  return product.status === "activo";
}

function isInCarousel(product) {
  return product.carousel === true;
}

function getImageUrl(product) {
  if (!product?.image_url) return "imagenes/no-image.png";
  if (product.image_url.startsWith("http")) return product.image_url;

  return `https://eaipcuvvddyrqkbmjmvw.supabase.co/storage/v1/object/public/product-images/${product.image_url}`;
}

/* ============================================================
   RENDER DESKTOP
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
    productsCount.textContent = "Mostrando 0 productos";
    return;
  }

  list.forEach(product => {
    const row = rowTemplate.content.cloneNode(true);

    const img = row.querySelector("img");
    img.src = getImageUrl(product);
    img.alt = product.name;
    img.loading = "lazy";
    img.onerror = () => img.src = "imagenes/no-image.png";

    row.querySelector(".p-name").textContent = product.name;
    row.querySelector(".p-price").textContent =
      formatPrice(product.price, product.currency);
    row.querySelector(".p-stock").textContent = product.stock;

    const carousel = row.querySelector(".p-carousel");
    carousel.textContent = isInCarousel(product) ? "Activo" : "Inactivo";
    carousel.className =
      `badge ${isInCarousel(product) ? "active" : "inactive"}`;

    const status = row.querySelector(".p-status");
    status.textContent = isActivo(product) ? "Activo" : "Inactivo";
    status.className =
      `badge ${isActivo(product) ? "active" : "inactive"}`;

    row.querySelector(".edit").dataset.id = product.id;
    row.querySelector(".delete").dataset.id = product.id;

    tbody.appendChild(row);
  });
}

/* ============================================================
   RENDER MÓVIL (FIX DEFINITIVO)
============================================================ */
function renderMobile(list) {
  mobileContainer.innerHTML = "";
  if (!list.length) return;

  list.forEach(product => {
    const card = cardTemplate.content.cloneNode(true);

    const img = card.querySelector("img");
    img.src = getImageUrl(product);
    img.alt = product.name;
    img.loading = "lazy";
    img.onerror = () => img.src = "imagenes/no-image.png";

    card.querySelector(".p-name").textContent = product.name;
    card.querySelector(".p-price").textContent =
      formatPrice(product.price, product.currency);
    card.querySelector(".p-stock").textContent =
      `Stock: ${product.stock}`;

    const toggle = card.querySelector(".p-carousel-toggle");
    const label  = card.querySelector(".carousel-status");

    /* estado inicial */
    toggle.checked = isInCarousel(product);
    actualizarLabel(label, toggle.checked);

    /* 🔥 FIX: escucha cambios */
    toggle.addEventListener("change", async () => {
      const activo = toggle.checked;
      actualizarLabel(label, activo);

      /* guarda en BD */
      const { error } = await window.supabaseClient
        .from("products")
        .update({ carousel: activo })
        .eq("id", product.id);

      if (error) {
        console.error("❌ Error actualizando carrusel", error);
        toggle.checked = !activo;
        actualizarLabel(label, !activo);
      }
    });

    card.querySelector(".edit").dataset.id = product.id;
    card.querySelector(".delete").dataset.id = product.id;

    mobileContainer.appendChild(card);
  });
}

/* ============================================================
   UI HELPERS
============================================================ */
function actualizarLabel(label, activo) {
  label.textContent = activo ? "Activo" : "Desactivado";
  label.className =
    `carousel-status ${activo ? "active" : "inactive"}`;
}

/* ============================================================
   FILTRO
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
   CARGA
============================================================ */
async function cargarProductos() {
  const { data, error } = await window.supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando productos", error);
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
