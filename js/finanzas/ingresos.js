/* ============================================================
   FINANZAS — INGRESOS | CAFÉ CORTERO
   ============================================================ */

console.log("📈 finanzas/ingresos.js — INIT");

(() => {
  const sb = window.supabaseClient;
  if (!sb) throw new Error("❌ Supabase no inicializado");

  let periodo = localStorage.getItem("fin_periodo") || "semana";
  let categoriaFiltro = "todos";
  let movimientos = [];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const CATEGORIAS = ["Todos", "Café Trillado", "Café Molido", "Café Tostado", "Todo en Uno", "Otros"];

  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function fmtMonto(n) {
    const num = Number(n) || 0;
    const fixed = num.toFixed(2);
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `HNL ${parts.join(".")}`;
  }

  function fmtMontoHTML(n, signo) {
    const num = Number(n) || 0;
    const fixed = num.toFixed(2);
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const s = signo || "";
    return `${s ? `<span style="color:var(--marron)">${s}</span>` : ""}<span style="color:var(--marron);font-weight:900;">${parts.join(".")}</span> <span style="color:var(--verde);font-weight:600;font-size:0.6em;vertical-align:super;">HNL</span>`;
  }

  function showSnackbar(msg) {
    let sb = document.querySelector(".fin-snackbar");
    if (!sb) {
      sb = document.createElement("div");
      sb.className = "fin-snackbar";
      document.body.appendChild(sb);
    }
    sb.textContent = msg;
    sb.classList.add("open");
    clearTimeout(sb._timer);
    sb._timer = setTimeout(() => sb.classList.remove("open"), 3000);
  }

  function getRangoFechas(per) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    let desde, hasta;

    switch (per) {
      case "dia":
        desde = new Date(y, m, d);
        hasta = new Date(y, m, d + 1);
        break;
      case "semana": {
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1;
        desde = new Date(y, m, d - diff);
        hasta = new Date(y, m, d - diff + 7);
        break;
      }
      case "mes":
        desde = new Date(y, m, 1);
        hasta = new Date(y, m + 1, 1);
        break;
    }

    return {
      desde: fmtDate(desde),
      hasta: fmtDate(hasta),
    };
  }

  function getRangoAnterior(per) {
    const { desde, hasta } = getRangoFechas(per);
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

  async function cargarIngresos() {
    const rango = getRangoFechas(periodo);
    console.log("📈 Query rango:", rango);
    const { data, error } = await sb
      .from("finanzas_movimientos")
      .select("*")
      .eq("tipo", "ingreso")
      .gte("fecha", rango.desde)
      .lt("fecha", rango.hasta)
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });

    if (error) {
      console.error("❌ Error:", error);
      return;
    }

    console.log("📈 Datos recibidos:", data?.length || 0);
    movimientos = data || [];
    renderResumen(movimientos);
    renderLista(movimientos);
  }

  function renderResumen(data) {
    const total = data.reduce((s, i) => s + Number(i.monto), 0);
    const el = document.getElementById("ingresos-total");
    if (el) el.innerHTML = fmtMontoHTML(total);

    const rangoAnt = getRangoAnterior(periodo);
    (async () => {
      const { data: antData } = await sb
        .from("finanzas_movimientos")
        .select("monto")
        .eq("tipo", "ingreso")
        .gte("fecha", rangoAnt.desde)
        .lt("fecha", rangoAnt.hasta);
      const antTotal = (antData || []).reduce((s, i) => s + Number(i.monto), 0);
      const diff = total - antTotal;
      const pct = antTotal !== 0 ? ((diff / antTotal) * 100).toFixed(1) : "0.0";
      const signo = diff >= 0 ? "+" : "";
      const elComp = document.getElementById("ingresos-compare");
      if (elComp) elComp.textContent = `${signo}${pct}% vs período anterior`;
    })();
  }

  function renderLista(data) {
    const container = document.getElementById("ingresos-lista");
    if (!container) return;

    let filtered = data;
    if (categoriaFiltro !== "todos") {
      filtered = data.filter((r) => r.categoria === categoriaFiltro);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="fin-empty">
          <span class="material-symbols-outlined">receipt_long</span>
          <div class="fin-empty-title">Sin ingresos en este período</div>
          <div class="fin-empty-desc">Registrá tu primer ingreso</div>
        </div>`;
      return;
    }

    const grupos = agruparPorPeriodo(filtered, periodo);
    let html = "";

    Object.keys(grupos).forEach((key) => {
      html += `<div class="fin-grupo-header">${key}</div>`;
      grupos[key].forEach((item, idx) => {
        const icon = ICONS[item.categoria] || "trending_up";
        html += `
          <div class="fin-item" data-id="${item.id}">
            <div class="fin-item-leading primary">
              <span class="material-symbols-outlined">${icon}</span>
            </div>
            <div class="fin-item-body">
              <div class="fin-item-concept">${item.concepto}</div>
              <div class="fin-item-categoria">${item.categoria}</div>
            </div>
            <div class="fin-item-trailing">${fmtMontoHTML(item.monto, "+")}</div>
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

  const ICONS = {
    "Café Trillado": "local_cafe",
    "Café Molido": "blender",
    "Café Tostado": "local_fire_department",
    "Todo en Uno": "all_inclusive",
    "Otros": "more_horiz",
  };

  function toggleDetail(el, item) {
    const existing = el.nextElementSibling;
    if (existing && existing.classList.contains("fin-item-detail")) {
      existing.querySelector(".fin-item-detail-inner").style.maxHeight = "0";
      setTimeout(() => existing.remove(), 300);
      el.classList.remove("expanded");
      return;
    }

    document.querySelectorAll(".fin-item-detail").forEach(d => d.remove());
    document.querySelectorAll(".fin-item.expanded").forEach(e => e.classList.remove("expanded"));

    const icon = ICONS[item.categoria] || "trending_up";
    const fechaStr = new Date(item.fecha + "T" + (item.hora || "00:00:00")).toLocaleDateString("es-HN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    const div = document.createElement("div");
    div.className = "fin-item-detail";
    div.innerHTML = `
      <div class="fin-item-detail-inner">
        <div class="fin-detail-header">
          <span class="material-symbols-outlined" style="color:var(--verde);font-size:22px;">${icon}</span>
          <span style="font:var(--md-label-lg);color:var(--md-on-surface-variant);opacity:0.7;">${item.categoria}</span>
          <span class="fin-detail-concepto">${item.concepto}</span>
        </div>
        <div class="fin-detail-row">
          <span class="fin-detail-label">Monto</span>
          <span class="fin-detail-value">${fmtMontoHTML(item.monto, "+")}</span>
        </div>
        <div class="fin-detail-row">
          <span class="fin-detail-label">Fecha</span>
          <span class="fin-detail-value">${fechaStr}</span>
        </div>
        <div class="fin-detail-row">
          <span class="fin-detail-label">Hora</span>
          <span class="fin-detail-value">${item.hora ? item.hora.slice(0, 5) : "--:--"}</span>
        </div>
        <div class="fin-detail-row">
          <span class="fin-detail-label">Notas</span>
          <span class="fin-detail-value">${item.notas || "—"}</span>
        </div>
        <div class="fin-detail-actions">
          <button class="fin-btn-outlined">Editar</button>
          <button class="fin-btn-text">Eliminar</button>
        </div>
      </div>
    `;
    el.after(div);
    el.classList.add("expanded");
    const inner = div.querySelector(".fin-item-detail-inner");
    requestAnimationFrame(() => {
      inner.style.maxHeight = inner.scrollHeight + "px";
    });

    div.querySelector(".fin-btn-outlined").addEventListener("click", () => {
      window.location.href = `/pages/admin/finanzas/registrar.html?id=${item.id}`;
    });

    div.querySelector(".fin-btn-text").addEventListener("click", async () => {
      if (!confirm("¿Eliminar este ingreso?")) return;
      const { error } = await sb.from("finanzas_movimientos").delete().eq("id", item.id);
      if (!error) {
        el.remove();
        div.remove();
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
        cargarIngresos();
      });
    });

    const chipContainer = document.getElementById("ingresos-chips");
    if (chipContainer) {
      CATEGORIAS.forEach((cat) => {
        const chip = document.createElement("button");
        chip.className = `fin-chip${cat === "Todos" ? " active" : ""}`;
        chip.dataset.categoria = cat === "Todos" ? "todos" : cat;
        chip.textContent = cat;
        chip.addEventListener("click", () => {
          chipContainer.querySelectorAll(".fin-chip").forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          categoriaFiltro = chip.dataset.categoria;
          renderLista(movimientos);
        });
        chipContainer.appendChild(chip);
      });
    }

    cargarIngresos();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) window.location.reload();
  });
})();
