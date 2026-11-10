// js/ui/header.search.js
// Material 3 Focused Search with Suggestions & Live Results

export function renderHeaderSearch({
  showFilter = false,
  showAdd = false,
  placeholder = "Buscar…"
}) {
  return `
    <div class="header-search-wrap">
      <div class="header-search-box">

        <span class="material-symbols-outlined search-icon">search</span>

        <input
          type="text"
          id="header-search-input"
          placeholder="${placeholder}"
          aria-label="${placeholder}"
          autocomplete="off"
        />

        ${showFilter
      ? `
            <select
              id="header-status-filter"
              class="header-status-filter"
              aria-label="Filtrar por estado"
            >
              <option value="pending">Pendientes</option>
              <option value="processing">En preparación</option>
              <option value="shipped">En camino</option>
              <option value="delivered">Entregados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          `
      : ""
    }

        ${showAdd
      ? `
            <button
              id="header-add-btn"
              class="header-add-btn"
              aria-label="Agregar producto"
              title="Agregar producto"
            >
              <span class="material-symbols-outlined">add</span>
            </button>
          `
      : ""
    }

      </div>

      <!-- M3 FOCUSED SEARCH SURFACE (Suggestions & Live Results) -->
      <div class="header-search-surface" id="header-search-surface">
        <div class="search-surface-content" id="search-surface-content"></div>
      </div>
    </div>
  `;
}

/* =====================================================
   M3 SEARCH HELPERS & STORAGE
===================================================== */
function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem("m3_recent_searches") || "[]");
  } catch (e) {
    return [];
  }
}

function saveRecentSearch(term) {
  if (!term || !term.trim()) return;
  term = term.trim();
  try {
    let searches = getRecentSearches();
    searches = searches.filter(s => s.toLowerCase() !== term.toLowerCase());
    searches.unshift(term);
    if (searches.length > 8) searches = searches.slice(0, 8);
    localStorage.setItem("m3_recent_searches", JSON.stringify(searches));
  } catch (e) {}
}

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightMatch(text, query) {
  if (!text || !query) return escapeHtml(text);
  const normText = normalize(text);
  const normQuery = normalize(query);
  const idx = normText.indexOf(normQuery);
  if (idx === -1) return escapeHtml(text);
  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + query.length));
  const after = escapeHtml(text.slice(idx + query.length));
  return `${before}<mark class="search-highlight">${match}</mark>${after}`;
}

function renderCustomerResultItem(customer, query) {
  const nameHtml = highlightMatch(customer.name || "Sin nombre", query);
  const emailHtml = highlightMatch(customer.email || "Sin email", query);
  const isAdmin = customer.rol === "admin" || customer.role === "admin";
  const initial = (customer.name || "C").trim().charAt(0).toUpperCase();

  const avatarHtml = customer.photo_url
    ? `<img src="${customer.photo_url}" alt="${escapeHtml(customer.name)}" class="search-item-avatar-img" />`
    : `<div class="search-item-avatar-init ${isAdmin ? 'admin-init' : ''}">${initial}</div>`;

  return `
    <div class="search-result-item" data-customer-id="${customer.id}" tabindex="0" role="button">
      <div class="search-item-avatar">${avatarHtml}</div>
      <div class="search-item-info">
        <div class="search-item-name">${nameHtml}</div>
        <div class="search-item-email">${emailHtml}</div>
      </div>
      ${isAdmin ? `<span class="search-item-badge">Admin</span>` : ""}
      <span class="material-symbols-outlined search-item-arrow">chevron_right</span>
    </div>
  `;
}

function attachSurfaceItemEvents() {
  const content = document.getElementById("search-surface-content");
  if (!content) return;

  // Click en chip de rol
  content.querySelectorAll(".search-quick-chip").forEach(chip => {
    chip.onclick = (e) => {
      e.stopPropagation();
      const role = chip.dataset.role || "todos";
      document.dispatchEvent(new CustomEvent("customer:filter", { detail: role }));
      document.dispatchEvent(new CustomEvent("user:filter", { detail: role === "usuario" ? "user" : (role === "todos" ? "all" : role) }));
      document.querySelectorAll(".customer-chip").forEach(c => {
        c.classList.toggle("active", (c.dataset.role || "todos") === role);
      });
      closeFocusedSearch();
    };
  });

  // Click en sugerencia de búsqueda
  content.querySelectorAll(".search-suggestion-item").forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      const q = item.dataset.query || "";
      const input = document.getElementById("header-search-input");
      if (input) {
        input.value = q;
        input.focus();
        saveRecentSearch(q);
        renderLiveResults(q);
        document.dispatchEvent(new CustomEvent("header:search", { detail: q }));
        document.dispatchEvent(new CustomEvent("customer:search", { detail: q }));
        document.dispatchEvent(new CustomEvent("user:search", { detail: q }));
      }
    };
  });

  // Click en resultado de cliente
  content.querySelectorAll(".search-result-item").forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      const id = item.dataset.customerId;
      const customers = window.__adminCustomers || window.__adminUsers || [];
      const customer = customers.find(c => c.id === id);
      if (customer) {
        saveRecentSearch(customer.name);
        const input = document.getElementById("header-search-input");
        if (input) input.value = customer.name;

        if (typeof window.__selectCustomer === "function") {
          window.__selectCustomer(customer);
        } else if (typeof window.__selectUser === "function") {
          window.__selectUser(customer);
        } else {
          document.dispatchEvent(new CustomEvent("customer:select", { detail: customer }));
          document.dispatchEvent(new CustomEvent("user:select", { detail: customer }));
        }

        closeFocusedSearch();
      }
    };
  });
}

function renderSuggestions() {
  const content = document.getElementById("search-surface-content");
  if (!content) return;

  const recents = getRecentSearches();
  const defaultSuggestions = ["Alan", "Sosa", "David", "Café Cortero"];
  const listToShow = recents.length ? recents : defaultSuggestions;

  const customers = window.__adminCustomers || window.__adminUsers || [];

  let html = `
    <!-- Sugerencias Rápidas / Filtros -->
    <div class="search-section">
      <div class="search-section-header">
        <span class="material-symbols-outlined header-icon">tune</span>
        <span>Filtros rápidos</span>
      </div>
      <div class="search-chips-row">
        <button type="button" class="search-quick-chip" data-role="todos">
          <span class="material-symbols-outlined">group</span>
          <span>Todos los roles</span>
        </button>
        <button type="button" class="search-quick-chip" data-role="admin">
          <span class="material-symbols-outlined">admin_panel_settings</span>
          <span>Administradores</span>
        </button>
        <button type="button" class="search-quick-chip" data-role="usuario">
          <span class="material-symbols-outlined">person</span>
          <span>Clientes</span>
        </button>
      </div>
    </div>

    <!-- Búsquedas Recientes / Sugerencias -->
    <div class="search-section">
      <div class="search-section-header">
        <span class="material-symbols-outlined header-icon">history</span>
        <span>${recents.length ? "Búsquedas recientes" : "Sugerencias de búsqueda"}</span>
      </div>
      <div class="search-suggestions-list">
        ${listToShow.map(item => `
          <div class="search-suggestion-item" data-query="${escapeHtml(item)}" tabindex="0" role="button">
            <span class="material-symbols-outlined item-icon">history</span>
            <span class="item-text">${escapeHtml(item)}</span>
            <span class="material-symbols-outlined item-action">north_west</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  // Contactos frecuentes sugeridos
  if (customers.length > 0) {
    const suggestedContacts = customers.slice(0, 5);
    html += `
      <div class="search-section">
        <div class="search-section-header">
          <span class="material-symbols-outlined header-icon">account_circle</span>
          <span>Contactos sugeridos</span>
        </div>
        <div class="search-results-list">
          ${suggestedContacts.map(c => renderCustomerResultItem(c, "")).join("")}
        </div>
      </div>
    `;
  }

  content.innerHTML = html;
  attachSurfaceItemEvents();
}

function renderLiveResults(query) {
  const content = document.getElementById("search-surface-content");
  if (!content) return;

  const customers = window.__adminCustomers || window.__adminUsers || [];
  const queryNorm = normalize(query);
  const tokens = queryNorm.split(/\s+/).filter(Boolean);

  const matches = customers.filter(c => {
    if (!tokens.length) return true;
    const nameNorm = normalize(c.name);
    const emailNorm = normalize(c.email);
    const phoneNorm = (c.phone || "").replace(/\s+/g, "");
    return tokens.every(t => nameNorm.includes(t) || emailNorm.includes(t) || phoneNorm.includes(t));
  });

  if (!matches.length) {
    content.innerHTML = `
      <div class="search-empty-state">
        <span class="material-symbols-outlined empty-icon">person_search</span>
        <p class="empty-title">Sin resultados</p>
        <p class="empty-subtitle">No se encontraron clientes para "<strong>${escapeHtml(query)}</strong>"</p>
        <button type="button" class="btn-clear-search-query">Borrar búsqueda</button>
      </div>
    `;
    const btnClear = content.querySelector(".btn-clear-search-query");
    if (btnClear) {
      btnClear.onclick = () => {
        const input = document.getElementById("header-search-input");
        if (input) {
          input.value = "";
          input.focus();
          renderSuggestions();
          document.dispatchEvent(new CustomEvent("header:search", { detail: "" }));
          document.dispatchEvent(new CustomEvent("customer:search", { detail: "" }));
        document.dispatchEvent(new CustomEvent("user:search", { detail: "" }));
        }
      };
    }
    return;
  }

  let html = `
    <div class="search-section">
      <div class="search-section-header">
        <span class="material-symbols-outlined header-icon">search</span>
        <span>Resultados (${matches.length})</span>
      </div>
      <div class="search-results-list">
        ${matches.map(c => renderCustomerResultItem(c, query)).join("")}
      </div>
    </div>
  `;

  content.innerHTML = html;
  attachSurfaceItemEvents();
}

/* =====================================================
   INIT HOOKS – BUSCADOR GLOBAL
===================================================== */
export function initHeaderSearchHooks() {
  const input = document.getElementById("header-search-input");
  const filter = document.getElementById("header-status-filter");
  const addBtn = document.getElementById("header-add-btn");

  if (input) {
    input.addEventListener("input", (e) => {
      const val = e.target.value || "";
      document.dispatchEvent(new CustomEvent("header:search", { detail: val }));
      document.dispatchEvent(new CustomEvent("customer:search", { detail: val }));
        document.dispatchEvent(new CustomEvent("user:search", { detail: val }));
    });
  }

  if (filter) {
    filter.addEventListener("change", (e) => {
      document.dispatchEvent(new CustomEvent("header:filter", { detail: e.target.value }));
    });
  }

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      document.dispatchEvent(new Event("header:add-click"));
    });
  }
}

/* =====================================================
   GLOBAL SEARCH DELEGATION – M3 FOCUSED SEARCH & CLEAR
===================================================== */
export function openFocusedSearch() {
  const header = document.getElementById("main-header") || document.querySelector("header.header-fixed");
  if (header) header.classList.add("header-search-active");
  document.body.classList.add("header-search-active");

  const leadingIcon = document.querySelector(".header-search-box .search-icon");
  if (leadingIcon) {
    leadingIcon.textContent = "arrow_back";
    leadingIcon.classList.add("btn-back-mode");
  }

  const surface = document.getElementById("header-search-surface");
  if (surface) {
    surface.classList.add("active");
  }

  const input = document.getElementById("header-search-input");
  const query = input ? (input.value || "").trim() : "";
  if (query) {
    renderLiveResults(query);
  } else {
    renderSuggestions();
  }
}

export function closeFocusedSearch() {
  const header = document.getElementById("main-header") || document.querySelector("header.header-fixed");
  if (header) header.classList.remove("header-search-active");
  document.body.classList.remove("header-search-active");

  const leadingIcon = document.querySelector(".header-search-box .search-icon");
  if (leadingIcon) {
    leadingIcon.textContent = "search";
    leadingIcon.classList.remove("btn-back-mode");
  }

  const surface = document.getElementById("header-search-surface");
  if (surface) {
    surface.classList.remove("active");
  }

  const input = document.getElementById("header-search-input");
  if (input) {
    input.blur();
  }
}

if (typeof window !== "undefined" && !window.__headerSearchDelegationInit) {
  window.__headerSearchDelegationInit = true;

  // Activar al enfocar
  document.addEventListener("focusin", (e) => {
    if (e.target && e.target.id === "header-search-input") {
      openFocusedSearch();
    }
  });

  // Activar al hacer click en la caja de búsqueda
  document.addEventListener("click", (e) => {
    const box = e.target.closest(".header-search-box");
    if (box && !e.target.closest(".btn-back-mode")) {
      const input = box.querySelector("#header-search-input");
      if (input && document.activeElement !== input) {
        input.focus();
        openFocusedSearch();
      }
    }

    // Botón volver de la búsqueda (arrow_back)
    if (e.target.closest(".search-icon.btn-back-mode")) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById("header-search-input");
      if (input) input.value = "";
      closeFocusedSearch();
      document.dispatchEvent(new CustomEvent("header:search", { detail: "" }));
      document.dispatchEvent(new CustomEvent("customer:search", { detail: "" }));
        document.dispatchEvent(new CustomEvent("user:search", { detail: "" }));
    }

    // Cerrar al hacer click fuera del contenedor de búsqueda
    const wrap = e.target.closest(".header-search-wrap");
    if (!wrap && document.body.classList.contains("header-search-active")) {
      closeFocusedSearch();
    }
  });

  // Pointerdown para respuesta instantánea al botón volver
  document.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".search-icon.btn-back-mode")) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById("header-search-input");
      if (input) input.value = "";
      closeFocusedSearch();
      document.dispatchEvent(new CustomEvent("header:search", { detail: "" }));
      document.dispatchEvent(new CustomEvent("customer:search", { detail: "" }));
        document.dispatchEvent(new CustomEvent("user:search", { detail: "" }));
    }
  });

  // Reenviar input siempre y actualizar resultados en vivo
  document.addEventListener("input", (e) => {
    if (e.target && e.target.id === "header-search-input") {
      const val = (e.target.value || "").trim();
      if (!document.body.classList.contains("header-search-active")) {
        openFocusedSearch();
      }
      if (val) {
        renderLiveResults(val);
      } else {
        renderSuggestions();
      }
      document.dispatchEvent(new CustomEvent("header:search", { detail: val }));
      document.dispatchEvent(new CustomEvent("customer:search", { detail: val }));
        document.dispatchEvent(new CustomEvent("user:search", { detail: val }));
    }
  });

  // Desactivar al presionar Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const input = document.getElementById("header-search-input");
      if (input && (document.activeElement === input || document.body.classList.contains("header-search-active"))) {
        closeFocusedSearch();
      }
    }
  });

  // Refrescar sugerencias cuando los clientes se cargan
  document.addEventListener("customers:ready", () => {
    if (document.body.classList.contains("header-search-active")) {
      const input = document.getElementById("header-search-input");
      const val = input ? (input.value || "").trim() : "";
      if (!val) renderSuggestions();
    }
  });
}
