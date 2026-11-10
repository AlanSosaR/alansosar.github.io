(() => {
  const sb = window.supabaseClient;
  if (!sb) throw new Error("❌ Supabase no inicializado");

  let periodo = localStorage.getItem("fin_periodo") || "semana";
  let categoriaFiltro = "todos";
  let movimientos = [];
  let periodoOffset = 0;
  let busqueda = "";
  let pagina = 1;
  const REGS_POR_PAGINA = 5;

  const CATEGORIAS = ["Todos", "Ahorro General", "Otros"];

  const COLOR = "#5c6bc0";

  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function fmtMontoHTML(n, signo) {
    const num = Number(n) || 0;
    const fixed = num.toFixed(2);
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const s = signo || "";
    return `${s ? `<span style="color:${COLOR};font-weight:900;">${s}</span>` : ""}<span style="color:${COLOR};font-weight:900;">${parts.join(".")}</span> <span style="color:var(--marron);font-weight:600;font-size:0.6em;vertical-align:super;">HNL</span>`;
  }

  function showSnackbar(msg, type = "success") {
    const el = document.getElementById("snackbar");
    if (!el) return;
    el.textContent = msg;
    el.className = "snackbar show";
    if (type) el.classList.add(type);
    setTimeout(() => el.classList.remove("show", "success", "error", "warn"), 3500);
  }

  function obtenerNombreUsuario() {
    try {
      const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
      return user?.name || user?.email || "—";
    } catch { return "—"; }
  }

  function showConfirmSnackbar(msg) {
    return new Promise((resolve) => {
      let sb = document.querySelector(".fin-snackbar-confirm");
      if (!sb) {
        sb = document.createElement("div");
        sb.className = "fin-snackbar-confirm";
        sb.innerHTML = `
          <span class="fin-snackbar-confirm-msg"></span>
          <div class="fin-snackbar-confirm-actions">
            <button class="fin-snackbar-btn-cancel">Cancelar</button>
            <button class="fin-snackbar-btn-confirm">Eliminar</button>
          </div>`;
        document.body.appendChild(sb);
      }
      sb.querySelector(".fin-snackbar-confirm-msg").textContent = msg;
      sb.classList.add("open");

      const cleanup = () => {
        sb.classList.remove("open");
        sb.querySelector(".fin-snackbar-btn-cancel").removeEventListener("click", onCancel);
        sb.querySelector(".fin-snackbar-btn-confirm").removeEventListener("click", onConfirm);
      };

      const onCancel = () => { cleanup(); resolve(false); };
      const onConfirm = () => { cleanup(); resolve(true); };

      sb.querySelector(".fin-snackbar-btn-cancel").addEventListener("click", onCancel);
      sb.querySelector(".fin-snackbar-btn-confirm").addEventListener("click", onConfirm);
    });
  }

  function getRangoFechas(per, offset) {
    offset = offset || 0;
    const now = new Date();
    let base = new Date(now);
    if (per === "semana") base.setDate(base.getDate() + offset * 7);
    else if (per === "dia") base.setDate(base.getDate() + offset);
    else if (per === "mes") base.setMonth(base.getMonth() + offset);

    const y = base.getFullYear();
    const m = base.getMonth();
    const d = base.getDate();
    let desde, hasta, label;

    switch (per) {
      case "dia":
        desde = new Date(y, m, d);
        hasta = new Date(y, m, d + 1);
        label = desde.toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        break;
      case "semana": {
        const day = base.getDay();
        const diff = day === 0 ? 6 : day - 1;
        desde = new Date(y, m, d - diff);
        hasta = new Date(y, m, d - diff + 7);
        label = `${desde.toLocaleDateString("es-HN", { day: "numeric", month: "short" })} – ${new Date(hasta.getTime() - 86400000).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}`;
        break;
      }
      case "mes":
        desde = new Date(y, m, 1);
        hasta = new Date(y, m + 1, 1);
        label = desde.toLocaleDateString("es-HN", { month: "long", year: "numeric" });
        break;
    }

    return {
      desde: fmtDate(desde),
      hasta: fmtDate(hasta),
      label,
    };
  }

  function getRangoAnterior(per) {
    const { desde, hasta } = getRangoFechas(per, periodoOffset);
    const d = new Date(desde);
    const h = new Date(hasta);
    const diff = h.getTime() - d.getTime();
    return {
      desde: fmtDate(new Date(d.getTime() - diff)),
      hasta: fmtDate(new Date(h.getTime() - diff)),
    };
  }

  function agruparPorPeriodo(items, per) {
    const grupos = {};
    items.forEach((item) => {
      const f = new Date(item.fecha + "T" + (item.hora || "00:00:00"));
      let key;
      switch (per) {
        case "dia": {
          const hh = f.getHours();
          const ampm = hh >= 12 ? "PM" : "AM";
          const h12 = hh % 12 || 12;
          key = `HOY ${h12}:00 ${ampm}`;
          break;
        }
        case "semana":
          key = f.toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
          break;
        case "mes":
          key = `SEMANA ${Math.ceil(f.getDate() / 7)}`;
          break;
      }
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(item);
    });
    return grupos;
  }

  async function cargarAhorros() {
    busqueda = ""; pagina = 1;
    document.getElementById("fin-search-row")?.classList.remove("open");
    const inp = document.getElementById("fin-search-input");
    if (inp) inp.value = "";
    const rango = getRangoFechas(periodo, periodoOffset);
    const labelEl = document.getElementById("periodo-label");
    if (labelEl) labelEl.textContent = rango.label;
    const { data, error } = await sb
      .from("finanzas_movimientos")
      .select("*")
      .eq("tipo", "ahorro")
      .gte("fecha", rango.desde)
      .lt("fecha", rango.hasta)
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });

    if (error) {
      console.error("❌ Error:", error);
      return;
    }

    movimientos = data || [];
    renderResumen(movimientos);
    renderLista(movimientos);
  }

  function renderResumen(data) {
    const total = data.reduce((s, i) => s + Number(i.monto), 0);
    const el = document.getElementById("ahorros-total");
    if (el) el.innerHTML = fmtMontoHTML(total);

    const rangoAnt = getRangoAnterior(periodo);
    (async () => {
      const { data: antData } = await sb
        .from("finanzas_movimientos")
        .select("monto")
        .eq("tipo", "ahorro")
        .gte("fecha", rangoAnt.desde)
        .lt("fecha", rangoAnt.hasta);
      const antTotal = (antData || []).reduce((s, i) => s + Number(i.monto), 0);
      const diff = total - antTotal;
      const pct = antTotal !== 0 ? ((diff / antTotal) * 100).toFixed(1) : "0.0";
      const signo = diff >= 0 ? "+" : "";
      const elComp = document.getElementById("ahorros-compare");
      if (elComp) elComp.textContent = `${signo}${pct}% vs período anterior`;
    })();
  }

  function renderLista(data) {
    const container = document.getElementById("ahorros-lista");
    if (!container) return;

    let filtered = data;
    if (categoriaFiltro !== "todos") {
      filtered = data.filter((r) => r.categoria === categoriaFiltro);
    }

    const q = busqueda.trim().toLowerCase();
    if (q) {
      const numQ = parseFloat(q.replace(/[^0-9.,]/g, "").replace(/,/g, ""));
      filtered = filtered.filter((r) => {
        if ((r.categoria || "").toLowerCase().includes(q)) return true;
        if ((r.notas || r.concepto || "").toLowerCase().includes(q)) return true;
        if (!isNaN(numQ) && Number(r.monto) === numQ) return true;
        return false;
      });
    }

    const total = filtered.length;
    const totalPaginas = Math.max(1, Math.ceil(total / REGS_POR_PAGINA));
    if (pagina > totalPaginas) pagina = totalPaginas;

    const start = (pagina - 1) * REGS_POR_PAGINA;
    const pageItems = filtered.slice(start, start + REGS_POR_PAGINA);

    const info = document.getElementById("fin-pagination-info");
    const prevBtn = document.getElementById("pag-prev");
    const nextBtn = document.getElementById("pag-next");
    if (info) {
      if (total === 0) {
        info.textContent = "Sin resultados";
      } else {
        const end = Math.min(start + REGS_POR_PAGINA, total);
        info.textContent = `Mostrando ${start + 1}–${end} de ${total} registros`;
      }
    }
    if (prevBtn) prevBtn.disabled = pagina <= 1;
    if (nextBtn) nextBtn.disabled = pagina >= totalPaginas;

    if (pageItems.length === 0) {
      container.innerHTML = `
        <div class="fin-empty">
          <span class="material-symbols-outlined">savings</span>
          <div class="fin-empty-title">${q ? "Sin resultados de búsqueda" : "Sin ahorros en este período"}</div>
          <div class="fin-empty-desc">${q ? "Intentá con otros términos" : "Registrá tu primer ahorro"}</div>
        </div>`;
      return;
    }

    const grupos = agruparPorPeriodo(pageItems, periodo);
    let html = "";

    Object.keys(grupos).forEach((key) => {
      html += `<div class="fin-grupo-header">${key}</div>`;
      grupos[key].forEach((item, idx) => {
        html += `
          <div class="fin-item" data-id="${item.id}">
            <div class="fin-item-leading secondary">
              <span class="material-symbols-outlined">savings</span>
            </div>
            <div class="fin-item-body">
              <div class="fin-item-head">
                <div class="fin-item-concept">${item.categoria}</div>
                <div class="fin-item-trailing">${fmtMontoHTML(item.monto, "+")}</div>
              </div>
              <div class="fin-item-categoria">${item.notas || item.concepto}</div>
            </div>
            <span class="material-symbols-outlined fin-item-chevron">expand_more</span>
          </div>`;
        if (idx < grupos[key].length - 1) {
          html += `<div class="fin-item-divider"></div>`;
        }
      });
    });

    container.innerHTML = html;

    container.querySelectorAll(".fin-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        const item = movimientos.find((r) => r.id === id);
        if (item) toggleDetail(el, item);
      });
    });
  }

  function toggleDetail(el, item) {
    const existing = el.nextElementSibling;
    if (existing && existing.classList.contains("fin-item-detail")) {
      existing.querySelector(".fin-item-detail-inner").style.maxHeight = "0";
      setTimeout(() => existing.remove(), 300);
      el.classList.remove("expanded");
      const cat = el.querySelector(".fin-item-categoria");
      if (cat) cat.style.display = "";
      return;
    }

    document.querySelectorAll(".fin-item-detail").forEach(d => d.remove());
    document.querySelectorAll(".fin-item.expanded").forEach(e => {
      e.classList.remove("expanded");
      const cat = e.querySelector(".fin-item-categoria");
      if (cat) cat.style.display = "";
    });

    const fechaStr = new Date(item.fecha + "T" + (item.hora || "00:00:00")).toLocaleDateString("es-HN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    const div = document.createElement("div");
    div.className = "fin-item-detail";
    div.innerHTML = `
      <div class="fin-item-detail-inner">
        <div class="fin-detail-row">
          <span class="fin-detail-label">Descripción</span>
          <span class="fin-detail-value">${item.concepto || "—"}</span>
        </div>
        ${item.notas ? `
        <div class="fin-detail-row">
          <span class="fin-detail-label">Notas</span>
          <span class="fin-detail-value">${item.notas}</span>
        </div>` : ""}
        <div class="fin-detail-row">
          <span class="fin-detail-label">Fecha</span>
          <span class="fin-detail-value">${fechaStr}${item.hora ? ` · ${item.hora.slice(0, 5)}` : ""}</span>
        </div>
        <div class="fin-detail-row">
          <span class="fin-detail-label">Método de pago</span>
          <span class="fin-detail-value">${item.metodo_pago || "—"}</span>
        </div>
        <div class="fin-detail-row">
          <span class="fin-detail-label">Registrado por</span>
          <span class="fin-detail-value">${obtenerNombreUsuario()}</span>
        </div>
        <div class="fin-detail-actions">
          <button class="fin-btn-outlined" style="border-color:var(--md-outline);color:var(--md-on-surface-variant);">Editar</button>
          <button class="fin-btn-outlined" style="border-color:#dc2626;color:#dc2626;">Eliminar</button>
        </div>
      </div>
    `;
    el.after(div);
    el.classList.add("expanded");
    const cat = el.querySelector(".fin-item-categoria");
    if (cat) cat.style.display = "none";
    const inner = div.querySelector(".fin-item-detail-inner");
    requestAnimationFrame(() => {
      inner.style.maxHeight = inner.scrollHeight + "px";
    });

    const btns = div.querySelectorAll(".fin-btn-outlined");
    btns[0].addEventListener("click", () => {
      window.location.href = `/pages/admin/finanzas/registrar.html?id=${item.id}`;
    });

    btns[1].addEventListener("click", async () => {
      if (!await showConfirmSnackbar("¿Eliminar este ahorro?")) return;
      const { error } = await sb.from("finanzas_movimientos").delete().eq("id", item.id);
      if (!error) {
        el.remove();
        div.remove();
        showSnackbar("Ahorro eliminado");
      } else {
        showSnackbar("Error al eliminar");
      }
    });
  }

  function init() {
    const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
    if (!user || user.rol !== "admin") return;

    const periodoGuardado = localStorage.getItem("fin_periodo") || "semana";
    periodo = periodoGuardado;

    document.querySelectorAll(".fin-seg-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.periodo === periodo);
      btn.addEventListener("click", () => {
        document.querySelectorAll(".fin-seg-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        periodo = btn.dataset.periodo;
        localStorage.setItem("fin_periodo", periodo);
        cargarAhorros();
      });
    });

    document.getElementById("periodo-prev")?.addEventListener("click", async () => {
      periodoOffset--;
      await cargarAhorros();
    });
    document.getElementById("periodo-next")?.addEventListener("click", async () => {
      periodoOffset++;
      await cargarAhorros();
    });

    document.getElementById("btn-search")?.addEventListener("click", () => {
      const row = document.getElementById("fin-search-row");
      const input = document.getElementById("fin-search-input");
      if (!row || !input) return;
      const isOpen = row.classList.toggle("open");
      if (isOpen) { input.focus(); }
      else { busqueda = ""; input.value = ""; pagina = 1; renderLista(movimientos); }
    });

    document.getElementById("fin-search-input")?.addEventListener("input", (e) => {
      busqueda = e.target.value;
      pagina = 1;
      renderLista(movimientos);
    });

    document.getElementById("fin-search-clear")?.addEventListener("click", () => {
      const input = document.getElementById("fin-search-input");
      if (!input) return;
      input.value = "";
      busqueda = "";
      pagina = 1;
      renderLista(movimientos);
      input.focus();
    });

    document.getElementById("pag-prev")?.addEventListener("click", () => {
      if (pagina > 1) { pagina--; renderLista(movimientos); }
    });
    document.getElementById("pag-next")?.addEventListener("click", () => {
      pagina++; renderLista(movimientos);
    });

    const chipContainer = document.getElementById("ahorros-chips");
    const trigger = document.getElementById("ahorros-cat-trigger");
    const menu = document.getElementById("ahorros-cat-menu");

    function closeMenu() {
      trigger?.classList.remove("open");
      menu?.classList.remove("open");
    }

    function openMenu() {
      trigger?.classList.add("open");
      menu?.classList.add("open");
    }

    function renderMenu() {
      if (!menu) return;
      menu.innerHTML = CATEGORIAS.map(cat => {
        const value = cat === "Todos" ? "todos" : cat;
        const selected = value === categoriaFiltro;
        return `<button class="fin-cat-menu-item${selected ? ' selected' : ''}" data-categoria="${value}">
          <span class="fin-cat-menu-item-text">${cat}</span>
          <span class="material-symbols-outlined fin-cat-menu-item-check">check</span>
        </button>`;
      }).join("");
      menu.querySelectorAll(".fin-cat-menu-item").forEach(item => {
        item.addEventListener("click", () => {
          categoriaFiltro = item.dataset.categoria;
          const label = item.querySelector(".fin-cat-menu-item-text")?.textContent || "Todos";
          const tIcon = trigger?.querySelector(".fin-cat-trigger-label");
          if (tIcon) tIcon.textContent = label;
          renderLista(movimientos);
          closeMenu();
        });
      });
    }

    trigger?.addEventListener("click", () => {
      if (menu?.classList.contains("open")) {
        closeMenu();
      } else {
        renderMenu();
        openMenu();
      }
    });

    document.addEventListener("click", (e) => {
      if (chipContainer && !chipContainer.contains(e.target)) {
        closeMenu();
      }
    });

    cargarAhorros();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) window.location.reload();
  });
})();
