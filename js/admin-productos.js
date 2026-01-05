console.log("🧩 admin-productos.js — FINAL ESTABLE");

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
const searchInput   = document.getElementById("search-products");
const btnAddProduct = document.getElementById("btnAddProduct");

/* ESTADO VACÍO */
const emptyState = document.getElementById("admin-empty-state");

/* PREVIEW */
const preview = {
  section: document.getElementById("admin-product-preview"),
  name: document.getElementById("p-name"),
  description: document.getElementById("p-description"),
  badge: document.getElementById("p-badge"),
  price: document.getElementById("p-price"),
  stock: document.getElementById("p-stock"),
  image: document.getElementById("p-image"),
  carouselToggle: document.getElementById("p-carousel-toggle"),
  carouselStatus: document.getElementById("carousel-status")
};

/* ACCIONES ADMIN */
const btnEditProduct   = document.querySelector(".admin-action-btn.edit");
const btnDeleteProduct = document.querySelector(".admin-action-btn.delete");

/* CARRUSEL */
const relatedSection    = document.querySelector(".admin-related");
const carouselContainer = document.getElementById("admin-products-carousel");
const carouselTemplate  = document.getElementById("tpl-admin-carousel-card");

const btnPrev = document.getElementById("admin-prev");
const btnNext = document.getElementById("admin-next");

/* SNACKBAR */
const snackbar = document.getElementById("snackbar");

/* ============================================================
   ESTADO
============================================================ */
let products = [];
let filteredProducts = [];
let selectedProductId = null;
let carouselIndex = 0;

/* ============================================================
   HELPERS
============================================================ */
function formatPrice(value, currency = "HNL") {
  if (value == null) return "—";
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

function updateCarouselStatus(active) {
  if (!preview.carouselStatus) return;

  preview.carouselStatus.textContent = active
    ? "Activo"
    : "Desactivado";

  preview.carouselStatus.className =
    `carousel-status ${active ? "active" : "inactive"}`;
}

/* ============================================================
   ESTADO VACÍO
============================================================ */
function mostrarEstadoVacio() {
  emptyState?.classList.remove("hidden");
  preview.section?.classList.add("hidden");
  relatedSection?.classList.add("hidden");
}

function ocultarEstadoVacio() {
  emptyState?.classList.add("hidden");
  preview.section?.classList.remove("hidden");
  relatedSection?.classList.remove("hidden");
}

/* ============================================================
   SNACKBAR CONFIRMACIÓN
============================================================ */
function showDeleteConfirm(onConfirm) {
  if (!snackbar) return;

  snackbar.innerHTML = `
    <span>¿Seguro que deseas eliminar este producto?</span>
    <button class="snackbar-btn-confirm">Sí</button>
  `;

  snackbar.classList.add("show");

  const btnConfirm = snackbar.querySelector(".snackbar-btn-confirm");

  btnConfirm.onclick = async () => {
    snackbar.classList.remove("show");
    await onConfirm();
  };

  setTimeout(() => {
    snackbar.classList.remove("show");
  }, 6000);
}

/* ============================================================
   PREVIEW PRINCIPAL
============================================================ */
function renderPreview(product) {
  if (!product) return;

  selectedProductId = product.id;

  preview.name.textContent =
    product.name || "—";

  preview.description.textContent =
    product.description || "Sin descripción";

  /* PÍLDORA */
  const badgeParts = [];

  if (product.category?.trim()) badgeParts.push(product.category);
  if (product.grind_type?.trim()) badgeParts.push(product.grind_type);

  preview.badge.textContent =
    badgeParts.length ? badgeParts.join(" · ") : "—";

  preview.price.textContent =
    formatPrice(product.price, product.currency);

  preview.stock.textContent =
    product.stock ?? "—";

  preview.image.src = getImageUrl(product);
  preview.image.onerror = () =>
    preview.image.src = "imagenes/no-image.png";

  /* SWITCH CARRUSEL */
  const activo = product.carousel === true;
  preview.carouselToggle.checked = activo;
  updateCarouselStatus(activo);

  preview.carouselToggle.onchange = async () => {
    const nuevoEstado = preview.carouselToggle.checked;
    updateCarouselStatus(nuevoEstado);

    const { error } = await window.supabaseClient
      .from("products")
      .update({ carousel: nuevoEstado })
      .eq("id", product.id);

    if (error) {
      console.error("❌ Error actualizando carrusel", error);
      preview.carouselToggle.checked = !nuevoEstado;
      updateCarouselStatus(!nuevoEstado);
      return;
    }

    product.carousel = nuevoEstado;
  };

  preview.section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/* ============================================================
   CARRUSEL
============================================================ */
function renderCarousel(list) {
  carouselContainer.innerHTML = "";

  list.forEach((product, index) => {
    const card = carouselTemplate.content.cloneNode(true);
    const root = card.querySelector(".admin-card");

    root.dataset.id = product.id;
    root.dataset.index = index;

    const img = root.querySelector("img");
    img.src = getImageUrl(product);
    img.alt = product.name;

    root.querySelector(".c-name").textContent = product.name;
    root.querySelector(".c-price").textContent =
      formatPrice(product.price, product.currency);

    root.addEventListener("click", () => {
      seleccionarProducto(index);
    });

    carouselContainer.appendChild(card);
  });

  actualizarScrollCarrusel();
}

/* ============================================================
   SELECCIÓN
============================================================ */
function seleccionarProducto(index) {
  const product = filteredProducts[index];
  if (!product) return;

  carouselIndex = index;

  document
    .querySelectorAll(".admin-card")
    .forEach(c => c.classList.remove("active-card"));

  const activeCard =
    carouselContainer.querySelector(`[data-index="${index}"]`);

  activeCard?.classList.add("active-card");

  renderPreview(product);
  actualizarScrollCarrusel();
}

/* ============================================================
   SCROLL
============================================================ */
function actualizarScrollCarrusel() {
  const card = carouselContainer.querySelector(".admin-card");
  if (!card) return;

  const gap = parseInt(getComputedStyle(carouselContainer).gap || 16);
  const width = card.offsetWidth + gap;

  carouselContainer.scrollTo({
    left: width * carouselIndex,
    behavior: "smooth"
  });
}

/* ============================================================
   FLECHAS
============================================================ */
btnPrev?.addEventListener("click", () => {
  if (carouselIndex > 0) {
    seleccionarProducto(carouselIndex - 1);
  }
});

btnNext?.addEventListener("click", () => {
  if (carouselIndex < filteredProducts.length - 1) {
    seleccionarProducto(carouselIndex + 1);
  }
});

/* ============================================================
   FILTRO
============================================================ */
function aplicarFiltro() {
  const q = searchInput.value.toLowerCase().trim();

  filteredProducts = !q
    ? [...products]
    : products.filter(p =>
        p.name.toLowerCase().includes(q)
      );

  if (!filteredProducts.length) {
    mostrarEstadoVacio();
    return;
  }

  ocultarEstadoVacio();
  renderCarousel(filteredProducts);
  seleccionarProducto(0);
}

/* ============================================================
   ELIMINAR PRODUCTO (BD + IMAGEN)
============================================================ */
async function eliminarProducto(product) {
  if (!product) return;

  /* 1️⃣ Eliminar imagen del bucket */
  if (product.image_url && !product.image_url.startsWith("http")) {
    const path = product.image_url.split("/product-images/")[1];

    if (path) {
      await window.supabaseClient
        .storage
        .from("product-images")
        .remove([path]);
    }
  }

  /* 2️⃣ Eliminar registro BD */
  const { error } = await window.supabaseClient
    .from("products")
    .delete()
    .eq("id", product.id);

  if (error) {
    console.error("❌ Error eliminando producto", error);
    return;
  }

  /* 3️⃣ Actualizar estado */
  products = products.filter(p => p.id !== product.id);
  filteredProducts = filteredProducts.filter(p => p.id !== product.id);

  if (!filteredProducts.length) {
    mostrarEstadoVacio();
  } else {
    renderCarousel(filteredProducts);
    seleccionarProducto(0);
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
    mostrarEstadoVacio();
    return;
  }

  products = data || [];

  if (!products.length) {
    mostrarEstadoVacio();
    return;
  }

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

  /* 🔍 Buscador */
  searchInput?.addEventListener("input", aplicarFiltro);

  /* ➕ Agregar producto */
  btnAddProduct?.addEventListener("click", () => {
    location.href = "admin-agregar-producto.html";
  });

  /* ✏️ Editar */
  btnEditProduct?.addEventListener("click", () => {
    if (!selectedProductId) return;
    location.href =
      `admin-agregar-producto.html?id=${selectedProductId}`;
  });

  /* 🗑️ Eliminar */
  btnDeleteProduct?.addEventListener("click", () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    showDeleteConfirm(() => eliminarProducto(product));
  });

  cargarProductos();
})();
