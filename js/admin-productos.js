console.log("🧩 admin-productos.js — PREVIEW + CARRUSEL + BD");

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
   DOM
============================================================ */
const tbody = document.getElementById("products-body");
const mobileContainer = document.getElementById("products-mobile");
const searchInput = document.getElementById("search-products");
const productsCount = document.getElementById("products-count");
const btnAddProduct = document.getElementById("btnAddProduct");

const rowTemplate = document.getElementById("tpl-product-row");
const cardTemplate = document.getElementById("tpl-product-card");
const carouselTemplate = document.getElementById("tpl-admin-carousel-card");

/* PREVIEW */
const preview = {
  section: document.getElementById("admin-product-preview"),
  name: document.getElementById("p-name"),
  category: document.getElementById("p-category"),
  subtext: document.getElementById("p-subtext"),
  badge: document.getElementById("p-badge"),
  description: document.getElementById("p-description"),
  price: document.getElementById("p-price"),
  stock: document.getElementById("p-stock"),
  status: document.getElementById("p-status"),
  image: document.getElementById("p-image"),
  carouselToggle: document.getElementById("p-carousel-toggle")
};

const carouselContainer = document.getElementById("admin-products-carousel");

/* ============================================================
   ESTADO
============================================================ */
let products = [];
let filteredProducts = [];
let selectedProductId = null;

/* ============================================================
   HELPERS
============================================================ */
function formatPrice(value, currency = "HNL") {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency
  }).format(value);
}

function getImageUrl(product) {
  if (!product?.image_url) return "imagenes/no-image.png";
  if (product.image_url.startsWith("http")) return product.image_url;
  return `https://eaipcuvvddyrqkbmjmvw.supabase.co/storage/v1/object/public/product-images/${product.image_url}`;
}

function isActivo(p) {
  return p.status === "activo";
}

/* ============================================================
   PREVIEW PRINCIPAL (MISMO CONCEPTO CLIENTE)
============================================================ */
function renderPreview(product) {
  if (!product) return;

  selectedProductId = product.id;

  preview.name.textContent = product.name;
  preview.category.textContent = product.category || "—";
  preview.subtext.textContent = "Tueste medio · Altura · Esencia familiar";
  preview.badge.textContent = "100% arábica · Danlí";
  preview.description.textContent = product.description || "Sin descripción";

  preview.price.textContent = formatPrice(product.price, product.currency);
  preview.stock.textContent = product.stock;
  preview.status.textContent = isActivo(product) ? "Activo" : "Inactivo";

  preview.image.src = getImageUrl(product);
  preview.image.onerror = () => preview.image.src = "imagenes/no-image.png";

  preview.carouselToggle.checked = product.carousel === true;

  /* actualizar switch */
  preview.carouselToggle.onchange = async () => {
    const activo = preview.carouselToggle.checked;

    const { error } = await window.supabaseClient
      .from("products")
      .update({ carousel: activo })
      .eq("id", product.id);

    if (error) {
      console.error("❌ Error actualizando carrusel", error);
      preview.carouselToggle.checked = !activo;
    } else {
      product.carousel = activo;
      renderCarousel(filteredProducts);
      renderTable(filteredProducts);
      renderMobile(filteredProducts);
    }
  };

  /* scroll suave */
  preview.section.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ============================================================
   CARRUSEL ADMIN
============================================================ */
function renderCarousel(list) {
  carouselContainer.innerHTML = "";

  list.forEach(product => {
    const card = carouselTemplate.content.cloneNode(true);
    const root = card.querySelector(".admin-card");

    root.dataset.id = product.id;
    root.querySelector("img").src = getImageUrl(product);
    root.querySelector("img").alt = product.name;
    root.querySelector(".c-name").textContent = product.name;
    root.querySelector(".c-price").textContent =
      formatPrice(product.price, product.currency);

    if (product.id === selectedProductId) {
      root.classList.add("active-card");
    }

    root.addEventListener("click", () => {
      document
        .querySelectorAll(".admin-card")
        .forEach(c => c.classList.remove("active-card"));

      root.classList.add("active-card");
      renderPreview(product);
    });

    carouselContainer.appendChild(card);
  });
}

/* ============================================================
   TABLA DESKTOP
============================================================ */
function renderTable(list) {
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `
      <tr><td colspan="7" style="text-align:center;padding:24px">
        No hay productos
      </td></tr>`;
    productsCount.textContent = "Mostrando 0 productos";
    return;
  }

  list.forEach(product => {
    const row = rowTemplate.content.cloneNode(true);

    const img = row.querySelector("img");
    img.src = getImageUrl(product);
    img.alt = product.name;

    row.querySelector(".p-name").textContent = product.name;
    row.querySelector(".p-price").textContent =
      formatPrice(product.price, product.currency);
    row.querySelector(".p-stock").textContent = product.stock;

    const carousel = row.querySelector(".p-carousel");
    carousel.textContent = product.carousel ? "Activo" : "Inactivo";
    carousel.className = `badge ${product.carousel ? "active" : "inactive"}`;

    const status = row.querySelector(".p-status");
    status.textContent = isActivo(product) ? "Activo" : "Inactivo";
    status.className = `badge ${isActivo(product) ? "active" : "inactive"}`;

    row.querySelector(".edit").onclick = () =>
      location.href = `admin-editar-producto.html?id=${product.id}`;

    row.querySelector(".delete").onclick = () =>
      alert("Eliminar producto (pendiente)");

    tbody.appendChild(row);
  });
}

/* ============================================================
   TARJETAS MÓVIL
============================================================ */
function renderMobile(list) {
  mobileContainer.innerHTML = "";

  list.forEach(product => {
    const card = cardTemplate.content.cloneNode(true);

    const img = card.querySelector("img");
    img.src = getImageUrl(product);
    img.alt = product.name;

    card.querySelector(".p-name").textContent = product.name;
    card.querySelector(".p-price").textContent =
      formatPrice(product.price, product.currency);
    card.querySelector(".p-stock").textContent =
      `Stock: ${product.stock}`;

    const toggle = card.querySelector(".p-carousel-toggle");
    toggle.checked = product.carousel === true;

    toggle.onchange = async () => {
      const activo = toggle.checked;

      const { error } = await window.supabaseClient
        .from("products")
        .update({ carousel: activo })
        .eq("id", product.id);

      if (error) {
        toggle.checked = !activo;
      } else {
        product.carousel = activo;
        renderCarousel(filteredProducts);
      }
    };

    card.querySelector(".edit").onclick = () =>
      location.href = `admin-editar-producto.html?id=${product.id}`;

    card.querySelector(".delete").onclick = () =>
      alert("Eliminar producto (pendiente)");

    mobileContainer.appendChild(card);
  });
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

  renderCarousel(filteredProducts);
  renderTable(filteredProducts);
  renderMobile(filteredProducts);

  productsCount.textContent =
    `Mostrando ${filteredProducts.length} productos`;

  if (!selectedProductId && filteredProducts.length) {
    renderPreview(filteredProducts[0]);
  }
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
   INIT
============================================================ */
(async function init() {
  await esperarSupabase();

  if (localStorage.getItem("cortero_logged") !== "1") {
    location.href = "login.html";
    return;
  }

  searchInput.addEventListener("input", aplicarFiltro);
  btnAddProduct.onclick = () =>
    location.href = "admin-agregar-producto.html";

  cargarProductos();
})();
