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
   DOM (UNA SOLA VEZ)
============================================================ */
const searchInput   = document.getElementById("search-products");
const btnAddProduct = document.getElementById("btnAddProduct");
const emptyState    = document.getElementById("admin-empty-state");

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

const btnEditProduct   = document.getElementById("btnEditProduct");
const btnDeleteProduct = document.getElementById("btnDeleteProduct");

const relatedSection    = document.querySelector(".admin-related");
const carouselContainer = document.getElementById("admin-products-carousel");
const carouselTemplate  = document.getElementById("tpl-admin-carousel-card");

/* SNACKBAR ELIMINAR */
const snackbarDelete   = document.getElementById("snackbar-delete");
const btnCancelDelete  = document.getElementById("btnCancelDelete");
const btnConfirmDelete = document.getElementById("btnConfirmDelete");

/* ============================================================
   ESTADO
============================================================ */
let products = [];
let filteredProducts = [];
let selectedProductId = null;
let carouselIndex = 0;
let productToDelete = null;

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
  preview.carouselStatus.textContent = active ? "Activo" : "Desactivado";
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

/* =========================================================
   SNACKBAR — CONFIRMACIÓN DE ELIMINACIÓN
========================================================= */

function showDeleteConfirm(product) {
  if (!product) return;

  productToDelete = product;

  snackbarDelete.classList.add("show");
  snackbarDelete.setAttribute("aria-hidden", "false");

  // 🔑 foco seguro en cancelar (UX + accesibilidad)
  btnCancelDelete.focus();
}

function closeDeleteConfirm() {
  snackbarDelete.classList.remove("show");
  snackbarDelete.setAttribute("aria-hidden", "true");

  productToDelete = null;

  // devolver foco al botón eliminar (opcional pero pro)
  btnDeleteProduct?.focus();
}

/* =====================
   CONFIRMAR
===================== */
btnConfirmDelete.addEventListener("click", async () => {
  if (!productToDelete) return;

  const product = productToDelete;
  closeDeleteConfirm();

  await eliminarProducto(product);
});

/* =====================
   CANCELAR
===================== */
btnCancelDelete.addEventListener("click", closeDeleteConfirm);

/* =====================
   TECLA ESC
===================== */
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    snackbarDelete.classList.contains("show")
  ) {
    closeDeleteConfirm();
  }
});

/* ============================================================
   PREVIEW PRINCIPAL
============================================================ */
function renderPreview(product) {
  if (!product) return;

  selectedProductId = product.id;

  preview.name.textContent = product.name || "—";
  preview.description.textContent =
    product.description || "Sin descripción";

  const badgeParts = [];
  if (product.category) badgeParts.push(product.category);
  if (product.grind_type) badgeParts.push(product.grind_type);
  if (product.presentation)
    badgeParts.push(
      product.presentation === "1lb"
        ? "1 lb"
        : product.presentation
    );

  preview.badge.textContent = badgeParts.join(" · ") || "—";

  preview.price.textContent =
    formatPrice(product.price, product.currency);

  preview.stock.textContent = product.stock ?? "—";

  const imgUrl = getImageUrl(product);
  preview.image.src = imgUrl
    ? `${imgUrl}?v=${Date.now()}`
    : "imagenes/no-image.png";

  preview.image.onerror = () => {
    preview.image.src = "imagenes/no-image.png";
  };

 /* =====================================================
   SLICE — MOSTRAR EN CARRUSEL DEL CLIENTE
===================================================== */
const activo = product.carousel === true;
preview.carouselToggle.checked = activo;
updateCarouselStatus(activo);

// ⚠️ quitar listeners anteriores (CLAVE)
preview.carouselToggle.onchange = null;

preview.carouselToggle.onchange = async () => {
  const nuevoEstado = preview.carouselToggle.checked;

  // feedback inmediato
  updateCarouselStatus(nuevoEstado);

  const { error } = await window.supabaseClient
    .from("products")
    .update({ carousel: nuevoEstado })
    .eq("id", product.id);

  if (error) {
    console.error("❌ Error actualizando carousel:", error);

    // rollback visual
    preview.carouselToggle.checked = !nuevoEstado;
    updateCarouselStatus(!nuevoEstado);
    return;
  }

  // ✅ ACTUALIZAR ESTADO LOCAL (CRÍTICO)
  product.carousel = nuevoEstado;

  const p = products.find(p => p.id === product.id);
  if (p) p.carousel = nuevoEstado;

  const fp = filteredProducts.find(p => p.id === product.id);
  if (fp) fp.carousel = nuevoEstado;

  console.log("✅ Carousel actualizado:", product.name, nuevoEstado);
};

/* ============================================================
   CARRUSEL
============================================================ */
function renderCarousel(list) {
  carouselContainer.innerHTML = "";

  list.forEach((product, index) => {
    const card = carouselTemplate.content.cloneNode(true);
    const root = card.querySelector(".admin-card");

    root.dataset.index = index;
    root.dataset.id = product.id;

    const img = root.querySelector("img");
    const imgUrl = getImageUrl(product);

    img.src = imgUrl
      ? `${imgUrl}?v=${Date.now()}`
      : "imagenes/no-image.png";

    img.onerror = () => {
      img.src = "imagenes/no-image.png";
    };

    root.querySelector(".c-name").textContent = product.name;
    root.querySelector(".c-price").textContent =
      formatPrice(product.price, product.currency);

    root.addEventListener("click", () => seleccionarProducto(index));

    carouselContainer.appendChild(card);
  });

  seleccionarProducto(0);
}

/* ============================================================
   SELECCIÓN
============================================================ */
function seleccionarProducto(index) {
  const product = filteredProducts[index];
  if (!product) return;

  carouselIndex = index;
  selectedProductId = product.id;

  document
    .querySelectorAll(".admin-card")
    .forEach(c => c.classList.remove("active-card"));

  carouselContainer
    .querySelector(`[data-index="${index}"]`)
    ?.classList.add("active-card");

  renderPreview(product);
  actualizarScrollCarrusel();
}

/* ============================================================
   SCROLL
============================================================ */
function actualizarScrollCarrusel() {
  const card = carouselContainer.querySelector(".admin-card");
  if (!card) return;

  const gap = parseInt(getComputedStyle(carouselContainer).gap || 16, 10);
  const width = card.offsetWidth + gap;

  carouselContainer.scrollTo({
    left: width * carouselIndex,
    behavior: "smooth"
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
        p.name.toLowerCase().includes(q)
      );

  if (!filteredProducts.length) {
    mostrarEstadoVacio();
    return;
  }

  ocultarEstadoVacio();
  renderCarousel(filteredProducts);
}

/* ============================================================
   ELIMINAR CAFÉ (BD + IMAGEN REAL)
============================================================ */
async function eliminarProducto(product) {
  // 🔒 Protección base
  if (!product?.id) {
    console.warn("⚠️ Producto inválido para eliminar:", product);
    safeSnackbar("⚠️ Producto inválido", "error");
    return;
  }

  try {
    /* =====================
       1️⃣ ELIMINAR IMAGEN (SI EXISTE)
    ===================== */
    if (product.image_url) {
      let path = product.image_url;

      // 🔑 Si viene como URL pública → extraer path real
      if (path.startsWith("http")) {
        try {
          const url = new URL(path);
          path = url.pathname.split("/product-images/")[1];
        } catch {
          console.warn("⚠️ No se pudo parsear image_url:", product.image_url);
          path = null;
        }
      }

      if (path) {
        const { error: imgError } = await window.supabaseClient
          .storage
          .from("product-images")
          .remove([path]);

        if (imgError) {
          console.warn("⚠️ Error eliminando imagen:", imgError.message);
        }
      }
    }

    /* =====================
       2️⃣ ELIMINAR PRODUCTO BD
    ===================== */
    const { error } = await window.supabaseClient
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) throw error;

    /* =====================
       3️⃣ ACTUALIZAR UI LOCAL
    ===================== */
    products = products.filter(p => p.id !== product.id);
    filteredProducts = filteredProducts.filter(p => p.id !== product.id);

    aplicarFiltro();

    /* =====================
       4️⃣ FEEDBACK
    ===================== */
    safeSnackbar("☕ Café eliminado correctamente", "success");

  } catch (err) {
    console.error("❌ Error eliminando café:", err);
    safeSnackbar("❌ No se pudo eliminar el café", "error");
  }
}

/* ============================================================
   CARGA
============================================================ */
async function cargarProductos() {
  const { data } = await window.supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

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

  searchInput?.addEventListener("input", aplicarFiltro);

  btnAddProduct?.addEventListener("click", () => {
    location.href = "admin-agregar-producto.html";
  });

  btnEditProduct?.addEventListener("click", () => {
    if (!selectedProductId) {
      safeSnackbar("Selecciona un café primero", "error");
      return;
    }
    location.href = `admin-agregar-producto.html?id=${selectedProductId}`;
  });

  btnDeleteProduct?.addEventListener("click", () => {
    if (!selectedProductId) {
      safeSnackbar("Selecciona un café primero", "error");
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (product) showDeleteConfirm(product);
  });

  await cargarProductos();
})();

/* ============================================================
   SAFE HELPERS
============================================================ */
function safeSnackbar(msg, type = "info") {
  if (typeof showSnackbar === "function") {
    showSnackbar(msg, type);
  } else {
    console.warn("Snackbar:", msg);
  }
}
