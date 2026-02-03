// js/ui/header.search.js

export function renderHeaderSearch({ showFilter = false, showAdd = false }) {
  return `
    <div class="header-search-wrap">
      <div class="header-search-box">

        <span class="material-symbols-outlined search-icon">search</span>

        <input
          type="search"
          id="header-search-input"
          placeholder="Buscar…"
          aria-label="Buscar"
        />

        ${
          showFilter
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

        ${
          showAdd
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
