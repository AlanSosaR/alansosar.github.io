// js/ui/header.search.js

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
          type="search"
          id="header-search-input"
          placeholder="${placeholder}"
          aria-label="${placeholder}"
        />

        ${showFilter
      ? `
            <select
              id="header-status-filter"
              class="header-status-filter"
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos</option>
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
    </div>
  `;
}

/* =====================================================
   INIT HOOKS — BUSCADOR GLOBAL
===================================================== */
export function initHeaderSearchHooks() {
  const input = document.getElementById("header-search-input");
  const filter = document.getElementById("header-status-filter");
  const addBtn = document.getElementById("header-add-btn");

  if (input) {
    input.addEventListener("input", (e) => {
      document.dispatchEvent(
        new CustomEvent("header:search", {
          detail: e.target.value || ""
        })
      );
    });
  }

  if (filter) {
    filter.addEventListener("change", (e) => {
      document.dispatchEvent(
        new CustomEvent("header:filter", {
          detail: e.target.value
        })
      );
    });
  }

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      document.dispatchEvent(new Event("header:add-click"));
    });
  }
}
