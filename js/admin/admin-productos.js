console.log("🧩 admin-productos.js — LISTA + DETALLE");

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

const emptyState = document.getElementById("admin-empty-state");
const EMPTY_BASE = window.location.origin + "/imagenes/empty/";

const productsList = document.getElementById("products-list");
const detailPanel = document.getElementById("product-detail-panel");
const detailEmpty = document.getElementById("detailEmpty");

/* SNACKBAR ELIMINAR */
const snackbarDelete = document.getElementById("snackbar-delete");
const btnCancelDelete = document.getElementById("btnCancelDelete");
const btnConfirmDelete = document.getElementById("btnConfirmDelete");

/* ============================================================
   ESTADO
============================================================ */
let products = [];
let filteredProducts = [];
let selectedProductId = null;
let productToDelete = null;
let searchActive = "";
let activeFilter = "all";

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
  if (!product?.image_url) return "/imagenes/no-image.png";
  if (product.image_url.startsWith("http")) return product.image_url;
  return `https://eaipcuvvddyrqkbmjmvw.supabase.co/storage/v1/object/public/product-images/${product.image_url}`;
}

/* ============================================================
   ESTADO VACÍO
============================================================ */
function mostrarEstadoVacio() {
  productsList.innerHTML = "";
  detailPanel.innerHTML = `
    <div class="detail-empty">
      <span class="material-symbols-outlined detail-empty-icon">coffee</span>
      <p class="detail-empty-text">Selecciona un producto para ver el detalle</p>
    </div>`;

  if (!emptyState) return;
  emptyState.classList.remove("hidden");

  const title = emptyState.querySelector(".empty-title");
  const text = emptyState.querySelector(".empty-text");
  const img = emptyState.querySelector(".empty-illustration");

  const isSearch = searchActive && filteredProducts.length === 0;

  if (isSearch) {
    title.textContent = "Sin resultados";
    text.textContent = `No encontramos ningún café que coincida con "${searchActive}".`;
    if (img) {
      img.src = EMPTY_BASE + "pending.svg";
      img.classList.remove("hidden");
    }
  } else {
    title.textContent = "No hay cafés registrados";
    text.textContent = "Agrega un café para que los clientes puedan verlo y comprarlo en la tienda.";
    if (img) {
      img.src = EMPTY_BASE + "processing.svg";
      img.classList.remove("hidden");
    }
  }
}

function ocultarEstadoVacio() {
  emptyState?.classList.add("hidden");
}

/* =========================================================
   SNACKBAR — CONFIRMACIÓN DE ELIMINACIÓN
========================================================= */
function showDeleteConfirm(product) {
  if (!product) return;
  productToDelete = product;
  snackbarDelete.classList.add("show");
  snackbarDelete.setAttribute("aria-hidden", "false");
  btnCancelDelete.focus();
}

function closeDeleteConfirm() {
  snackbarDelete.classList.remove("show");
  snackbarDelete.setAttribute("aria-hidden", "true");
  productToDelete = null;
}

btnConfirmDelete.addEventListener("click", async () => {
  if (!productToDelete) return;
  const product = productToDelete;
  closeDeleteConfirm();
  await eliminarProducto(product);
});

btnCancelDelete.addEventListener("click", closeDeleteConfirm);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && snackbarDelete.classList.contains("show")) {
    closeDeleteConfirm();
  }
});

/* ============================================================
   RENDERIZAR LISTA DE PRODUCTOS
============================================================ */
function renderList(list) {
  productsList.innerHTML = "";

  if (!list.length) {
    mostrarEstadoVacio();
    return;
  }

  ocultarEstadoVacio();

  list.forEach(product => {
    const row = document.createElement("div");
    row.className = "product-row";
    row.dataset.id = product.id;

    const imgUrl = getImageUrl(product);
    const stock = product.stock ?? 0;

    let badgeClass = "badge-inactive";
    let badgeText = "Inactivo";
    if (product.active !== false) {
      if (stock <= 15) {
        badgeClass = "badge-low-stock";
        badgeText = "Stock bajo";
      } else {
        badgeClass = "badge-active";
        badgeText = "Activo";
      }
    }

    row.innerHTML = `
      <img class="product-row-thumb" src="${imgUrl}" alt="${product.name}" loading="lazy">
      <div class="product-row-info">
        <p class="product-row-name">${product.name || "—"}</p>
        <p class="product-row-meta">${product.category || ""}${product.grind_type ? " · " + product.grind_type : ""}</p>
      </div>
      <div class="product-row-right">
        <p class="product-row-price">${formatPrice(product.price, product.currency)}</p>
        <p class="product-row-stock">${stock} en almacén</p>
      </div>
      <span class="product-row-badge ${badgeClass}">${badgeText}</span>
    `;

    row.addEventListener("click", () => selectProduct(product.id));
    productsList.appendChild(row);
  });

  if (selectedProductId) {
    const match = list.find(p => p.id === selectedProductId);
    if (match) {
      const prevRow = productsList.querySelector(".product-row.selected");
      if (prevRow) prevRow.classList.remove("selected");
      const row = productsList.querySelector(`[data-id="${selectedProductId}"]`);
      if (row) row.classList.add("selected");
    } else {
      selectProduct(list[0].id);
    }
  } else if (list.length > 0) {
    selectProduct(list[0].id);
  }
}

/* ============================================================
   RENDERIZAR PANEL DE DETALLE
============================================================ */
function renderDetail(product) {
  if (!product) {
    detailPanel.innerHTML = `
      <div class="detail-empty">
        <span class="material-symbols-outlined detail-empty-icon">coffee</span>
        <p class="detail-empty-text">Selecciona un producto para ver el detalle</p>
      </div>`;
    return;
  }

  const imgUrl = getImageUrl(product);
  const stock = product.stock ?? 0;

  const tags = [];
  if (product.category) tags.push(product.category);
  if (product.grind_type) tags.push(product.grind_type);
  if (product.presentation) {
    tags.push(product.presentation === "1lb" ? "1 lb" : product.presentation);
  }

  const featuredActive = product.featured === true;

  detailPanel.innerHTML = `
    <div class="detail-content">
      <div class="detail-main">
        <div class="detail-image-wrap">
          <img src="${imgUrl}?v=${Date.now()}" alt="${product.name}"
            onerror="this.src='/imagenes/no-image.png'">
        </div>
        <div class="detail-info">
          <h3 class="detail-name">${product.name || "—"}</h3>
          <p class="detail-desc">${product.description || "Sin descripción"}</p>
          <div class="detail-tags">
            ${tags.map(t => `<span class="detail-tag">${t}</span>`).join("")}
          </div>
        </div>
      </div>
      <div class="detail-stats">
        <div class="stat-card">
          <p class="stat-label">Precio</p>
          <p class="stat-value">${formatPrice(product.price, product.currency)}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">En almacén</p>
          <p class="stat-value">${stock}</p>
        </div>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Fecha de tueste</span>
        <span class="detail-row-value">${product.fecha_tueste || "No especificada"}</span>
      </div>
      <div class="detail-carousel-row">
        <div class="detail-carousel-left">
          <p class="detail-carousel-label">Mostrar en carrusel</p>
          <p class="detail-carousel-note ${featuredActive ? "visible-note" : ""}">
            ${featuredActive ? "Visible en la tienda" : "No visible en tienda"}
          </p>
        </div>
        <label class="switch">
          <input type="checkbox" id="d-carousel-toggle" ${featuredActive ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </div>
    </div>
    <div class="detail-actions">
      <button class="detail-action-btn delete-btn" id="d-delete-btn">
        <span class="material-symbols-outlined">delete</span>
        Eliminar
      </button>
      <button class="detail-action-btn edit-btn" id="d-edit-btn">
        <span class="material-symbols-outlined">edit</span>
        Editar producto
      </button>
    </div>
  `;

  /* =====================
     CARRUSEL TOGGLE
  ===================== */
  const toggle = document.getElementById("d-carousel-toggle");
  toggle.onchange = async () => {
    const nuevoEstado = toggle.checked;
    const note = detailPanel.querySelector(".detail-carousel-note");
    note.textContent = nuevoEstado ? "Visible en la tienda" : "No visible en tienda";
    note.className = `detail-carousel-note ${nuevoEstado ? "visible-note" : ""}`;

    const { error } = await window.supabaseClient
      .from("products")
      .update({ featured: nuevoEstado })
      .eq("id", product.id);

    if (error) {
      console.error("❌ Error actualizando featured:", error);
      toggle.checked = !nuevoEstado;
      note.textContent = !nuevoEstado ? "Visible en la tienda" : "No visible en tienda";
      note.className = `detail-carousel-note ${!nuevoEstado ? "visible-note" : ""}`;
      return;
    }

    product.featured = nuevoEstado;
    const p = products.find(p => p.id === product.id);
    if (p) p.featured = nuevoEstado;
    const fp = filteredProducts.find(p => p.id === product.id);
    if (fp) fp.featured = nuevoEstado;
  };

  /* =====================
     BOTÓN ELIMINAR
  ===================== */
  document.getElementById("d-delete-btn").addEventListener("click", () => {
    showDeleteConfirm(product);
  });

  /* =====================
     BOTÓN EDITAR
  ===================== */
  document.getElementById("d-edit-btn").addEventListener("click", () => {
    location.href = `/pages/admin/admin-agregar-producto.html?id=${product.id}`;
  });
}

/* ============================================================
   SELECCIÓN DE PRODUCTO
============================================================ */
function selectProduct(id) {
  const product = filteredProducts.find(p => p.id === id);
  if (!product) return;

  selectedProductId = product.id;

  const prevRow = productsList.querySelector(".product-row.selected");
  if (prevRow) prevRow.classList.remove("selected");

  const row = productsList.querySelector(`[data-id="${id}"]`);
  if (row) row.classList.add("selected");

  renderDetail(product);

  if (window.innerWidth <= 1100) {
    detailPanel.closest(".detail-panel-column")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

/* ============================================================
   FILTRO
============================================================ */
function aplicarFiltro(query) {
  searchActive = (typeof query === "string" ? query : "").toLowerCase().trim();

  let base = !searchActive
    ? [...products]
    : products.filter(p => {
        const nameMatch = (p.name || "").toLowerCase().includes(searchActive);
        const descMatch = (p.description || "").toLowerCase().includes(searchActive);
        const catMatch = (p.category || "").toLowerCase().includes(searchActive);
        const grindMatch = (p.grind_type || "").toLowerCase().includes(searchActive);
        return nameMatch || descMatch || catMatch || grindMatch;
      });

  switch (activeFilter) {
    case "active":
      base = base.filter(p => p.active !== false);
      break;
    case "carousel":
      base = base.filter(p => p.featured === true);
      break;
  }

  filteredProducts = base;

  if (!filteredProducts.length) {
    mostrarEstadoVacio();
    return;
  }

  ocultarEstadoVacio();
  renderList(filteredProducts);
}

/* ============================================================
   ELIMINAR CAFÉ (BD + IMAGEN REAL)
============================================================ */
async function eliminarProducto(product) {
  if (!product?.id) {
    console.warn("⚠️ Producto inválido para eliminar:", product);
    safeSnackbar("⚠️ Producto inválido", "error");
    return;
  }

  try {
    if (product.image_url) {
      let path = product.image_url;
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

    const { error } = await window.supabaseClient
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) throw error;

    products = products.filter(p => p.id !== product.id);
    filteredProducts = filteredProducts.filter(p => p.id !== product.id);

    if (selectedProductId === product.id) {
      selectedProductId = null;
    }

    aplicarFiltro();

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
(function init() {
  esperarSupabase().then(() => {

    if (localStorage.getItem("cortero_logged") !== "1") {
      location.href = "/pages/auth/login.html";
      return;
    }

    /* =====================
       FILTROS PILL
    ===================== */
    const pills = document.querySelectorAll("#filterPills .pill");
    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        pills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        activeFilter = pill.dataset.filter;
        aplicarFiltro();
      });
    });

    /* =====================
       BOTÓN NUEVO PRODUCTO
    ===================== */
    document.getElementById("btnAddProduct").addEventListener("click", () => {
      location.href = "/pages/admin/admin-agregar-producto.html";
    });

    /* =====================
       SEARCH
    ===================== */
    document.addEventListener("header:search", (e) => {
      aplicarFiltro(e.detail);
    });

    /* =====================
       BOTÓN NUEVO DESDE HEADER (add-btn)
    ===================== */
    document.addEventListener("header:add-click", () => {
      location.href = "/pages/admin/admin-agregar-producto.html";
    });

    cargarProductos();
  });
})();

/* ============================================================
   SNACKBAR
============================================================ */
function showSnackbar(message, type = "success") {
  const el = document.getElementById("snackbar");
  if (!el) return;
  el.textContent = message;
  el.className = `snackbar ${type}`;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3500);
}

function safeSnackbar(msg, type = "info") {
  showSnackbar(msg, type);
}
