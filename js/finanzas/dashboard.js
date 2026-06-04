/* ============================================================
   FINANZAS — DASHBOARD | CAFÉ CORTERO
   ============================================================ */

console.log("📊 finanzas/dashboard.js — INIT");

(() => {
  const sb = window.supabaseClient;
  if (!sb) throw new Error("❌ Supabase no inicializado");

  /* --- STATE --- */
  let periodo = localStorage.getItem("fin_periodo") || "semana";
  let periodoOffset = 0;
  let filtro = "ambos";
  let movimientos = [];

  /* --- DOM REFS --- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    segBtns: () => $$(".fin-seg-btn"),
    periodoLabel: () => $(".fin-periodo-label"),
    saldoMonto: () => $(".fin-saldo-monto"),
    saldoCompare: () => $(".fin-saldo-compare"),
    ingresosMonto: () => $("#ingresos-monto"),
    ingresosCompare: () => $("#ingresos-compare"),
    egresosMonto: () => $("#egresos-monto"),
    egresosCompare: () => $("#egresos-compare"),
    historial: () => $("#fin-historial-list"),
    filterChips: () => $$(".fin-filter-chips .fin-chip"),
    fab: () => $(".fin-fab"),
    fabLabel: () => $(".fin-fab-label"),
    chartCanvas: () => $("#fin-chart"),
  };

  /* --- UTILS --- */
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

  function fmtMontoHTML(n, signo, esIngreso) {
    const num = Number(n) || 0;
    const fixed = num.toFixed(2);
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const s = signo || "";
    const color = esIngreso === undefined ? (num >= 0 ? "var(--verde)" : "var(--md-error)") : esIngreso ? "var(--verde)" : "var(--md-error)";
    return `${s ? `<span style="color:var(--marron)">${s}</span>` : ""}<span style="color:${color};font-weight:900;">${parts.join(".")}</span> <span style="color:var(--marron);font-weight:600;font-size:0.6em;vertical-align:super;">HNL</span>`;
  }

  function obtenerNombreUsuario() {
    try {
      const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
      return user?.name || user?.email || "—";
    } catch { return "—"; }
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
      case "dia": {
        desde = new Date(y, m, d);
        hasta = new Date(y, m, d + 1);
        label = desde.toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        break;
      }
      case "semana": {
        const day = base.getDay();
        const diff = day === 0 ? 6 : day - 1;
        desde = new Date(y, m, d - diff);
        hasta = new Date(y, m, d - diff + 7);
        label = `${desde.toLocaleDateString("es-HN", { day: "numeric", month: "short" })} – ${new Date(hasta.getTime() - 86400000).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}`;
        break;
      }
      case "mes": {
        desde = new Date(y, m, 1);
        hasta = new Date(y, m + 1, 1);
        label = desde.toLocaleDateString("es-HN", { month: "long", year: "numeric" });
        break;
      }
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

    const antDesde = new Date(d.getTime() - diff);
    const antHasta = new Date(h.getTime() - diff);

    return {
      desde: fmtDate(antDesde),
      hasta: fmtDate(antHasta),
    };
  }

  function agruparPorPeriodo(items, per) {
    const grupos = {};
    const now = new Date();

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
        case "semana": {
          key = f.toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
          break;
        }
        case "mes": {
          const semana = Math.ceil(f.getDate() / 7);
          key = `SEMANA ${semana}`;
          break;
        }
      }

      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(item);
    });

    return grupos;
  }

  /* --- RENDER --- */
  async function renderSaldo(ingresos, egresos, periodoActual) {
    const totalIngresos = ingresos.reduce((s, i) => s + Number(i.monto), 0);
    const totalEgresos = egresos.reduce((s, i) => s + Number(i.monto), 0);
    const saldo = totalIngresos - totalEgresos;

    if (els.saldoMonto()) els.saldoMonto().innerHTML = fmtMontoHTML(saldo);

    // Comparación con período anterior
    const rangoAnt = getRangoAnterior(periodoActual);
    const { data: antData } = await awaitQuery(rangoAnt.desde, rangoAnt.hasta);
    const antIng = antData.filter((r) => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0);
    const antEgr = antData.filter((r) => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
    const antSaldo = antIng - antEgr;
    const diff = saldo - antSaldo;
    const signo = diff >= 0 ? "+" : "";
    const pct = antSaldo !== 0 ? ((diff / Math.abs(antSaldo)) * 100).toFixed(1) : "0.0";

    if (els.saldoCompare()) {
      els.saldoCompare().textContent = `${signo}${fmtMonto(diff)} (${signo}${pct}%) vs período anterior`;
    }
  }

  async function awaitQuery(desde, hasta) {
    const { data, error } = await sb
      .from("finanzas_movimientos")
      .select("*")
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });

    if (error) {
      console.error("❌ Error query:", error);
      return { data: [] };
    }
    console.log(`📊 awaitQuery (${desde} → ${hasta}): ${data?.length || 0} registros`);
    return { data: data || [] };
  }

  async function cargarDashboard() {
    try {
      const rango = getRangoFechas(periodo, periodoOffset);
      if (els.periodoLabel()) els.periodoLabel().textContent = rango.label;

      // Parallel: all-time data for saldo, period data for chart/historial
      const [periodResult, allResult] = await Promise.all([
        awaitQuery(rango.desde, rango.hasta),
        sb.from("finanzas_movimientos").select("*"),
      ]);

      const { data } = periodResult;
      const allData = allResult?.data || [];
      movimientos = data;

      // Saldo — always from ALL data
      const allIng = allData.filter((r) => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0);
      const allEgr = allData.filter((r) => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
      if (els.saldoMonto()) els.saldoMonto().innerHTML = fmtMontoHTML(allIng - allEgr);
      if (els.saldoCompare()) els.saldoCompare().style.display = "none";

      // Stats cards (period-specific)
      const ingresos = data.filter((r) => r.tipo === "ingreso");
      const egresos = data.filter((r) => r.tipo === "egreso");
      if (els.ingresosMonto()) els.ingresosMonto().innerHTML = fmtMontoHTML(ingresos.reduce((s, i) => s + Number(i.monto), 0), "", true);
      if (els.egresosMonto()) els.egresosMonto().innerHTML = fmtMontoHTML(egresos.reduce((s, i) => s + Number(i.monto), 0), "", false);

      // Chart & historial from filtered data
      renderChart(data);
      renderHistorial(data);
    } catch (err) {
      console.error("📊 Error en cargarDashboard:", err);
      showSnackbar("Error al cargar datos");
    }
  }

  let chartInstance = null;

  function renderChart(data) {
    const canvas = els.chartCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (chartInstance) chartInstance.destroy();

    const ingresos = data.filter((r) => r.tipo === "ingreso");
    const egresos = data.filter((r) => r.tipo === "egreso");

    let labels = [];
    let ingData = [];
    let egrData = [];

    const agrupado = {};
    const now = new Date();

    const allDates = [...new Set(data.map((r) => r.fecha))].sort();

    console.log("📊 renderChart - periodo:", periodo, "data count:", data.length, "data:", data.map(r => ({fecha: r.fecha, hora: r.hora, tipo: r.tipo, monto: r.monto})));

    if (periodo === "dia") {
      labels = Array.from({length: 24}, (_, i) => {
        const ampm = i >= 12 ? "PM" : "AM";
        const h12 = i % 12 || 12;
        return `${h12} ${ampm}`;
      });
      labels.forEach((_, hh) => {
        const items = data.filter(r => parseInt((r.hora || "00:00").split(":")[0]) === hh);
        ingData.push(items.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0));
        egrData.push(items.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0));
      });
      console.log("📊 Chart dia - labels:", labels, "ingData:", ingData, "egrData:", egrData);
    } else if (periodo === "semana") {
      const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      labels = diasSemana;
      diasSemana.forEach((_, i) => {
        const dayIdx = i + 1;
        const items = data.filter((r) => new Date(r.fecha).getDay() === dayIdx % 7);
        ingData.push(items.filter((r) => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0));
        egrData.push(items.filter((r) => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0));
      });
    } else if (periodo === "mes") {
      labels = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];
      labels.forEach((_, i) => {
        const weekStart = i * 7 + 1;
        const weekEnd = weekStart + 7;
        const items = data.filter((r) => {
          const d = new Date(r.fecha).getDate();
          return d >= weekStart && d < weekEnd;
        });
        ingData.push(items.filter((r) => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0));
        egrData.push(items.filter((r) => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0));
      });
    }

    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue("--md-primary").trim() || "#3A6B35";
    const errorColor = style.getPropertyValue("--md-error").trim() || "#D85A30";
    const surfaceColor = style.getPropertyValue("--md-surface-container").trim() || "#E2E8DC";

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Ingresos",
            data: ingData,
            backgroundColor: primaryColor,
            borderRadius: 4,
            barThickness: 8,
          },
          {
            label: "Egresos",
            data: egrData,
            backgroundColor: errorColor,
            borderRadius: 4,
            barThickness: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 500,
          easing: "easeOutQuart",
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            align: "center",
            labels: {
              usePointStyle: true,
              font: { family: "Poppins", size: 12 },
              padding: 16,
              color: (ctx) => ctx.datasetIndex === 0 ? primaryColor : errorColor,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${fmtMonto(ctx.raw)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "Poppins", size: 11 } },
          },
          y: {
            grid: { color: "rgba(0,0,0,0.06)" },
            ticks: {
              font: { family: "Poppins", size: 11 },
              callback: (v) => fmtMonto(v),
            },
          },
        },
      },
    });
  }

  function renderHistorial(data) {
    const container = els.historial();
    if (!container) return;

    let filtered = data;
    if (filtro === "ingreso") filtered = data.filter((r) => r.tipo === "ingreso");
    else if (filtro === "egreso") filtered = data.filter((r) => r.tipo === "egreso");

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="fin-empty">
          <span class="material-symbols-outlined">receipt_long</span>
          <div class="fin-empty-title">Sin movimientos en este período</div>
          <div class="fin-empty-desc">Registrá tu primer movimiento</div>
        </div>`;
      return;
    }

    const grupos = agruparPorPeriodo(filtered, periodo);
    let html = "";

    Object.keys(grupos).forEach((key) => {
      html += `<div class="fin-grupo-header">${key}</div>`;
      grupos[key].forEach((item, idx) => {
        const isIngreso = item.tipo === "ingreso";
        const icon = CATEGORY_ICONS[item.categoria] || (isIngreso ? "trending_up" : "trending_down");
        html += `
          <div class="fin-item" data-id="${item.id}">
            <div class="fin-item-leading ${isIngreso ? "primary" : "error"}">
              <span class="material-symbols-outlined">${icon}</span>
            </div>
            <div class="fin-item-body">
              <div class="fin-item-concept">${item.categoria}</div>
              <div class="fin-item-categoria">${item.notas || item.concepto}</div>
            </div>
            <div class="fin-item-trailing ${isIngreso ? "primary" : "error"}">
              ${fmtMontoHTML(item.monto, isIngreso ? "+" : "−", isIngreso)}
            </div>
            <span class="material-symbols-outlined fin-item-chevron">expand_more</span>
          </div>`;
        if (idx < grupos[key].length - 1) {
          html += `<div class="fin-item-divider"></div>`;
        }
      });
    });

    container.innerHTML = html;

    // Tap item -> expandable detail
    container.querySelectorAll(".fin-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        const item = data.find((r) => r.id === id);
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
      return;
    }

    document.querySelectorAll(".fin-item-detail").forEach(d => d.remove());
    document.querySelectorAll(".fin-item.expanded").forEach(e => e.classList.remove("expanded"));

    const isIngreso = item.tipo === "ingreso";
    const icon = CATEGORY_ICONS[item.categoria] || (isIngreso ? "trending_up" : "trending_down");
    const fechaStr = new Date(item.fecha + "T" + (item.hora || "00:00:00")).toLocaleDateString("es-HN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    const div = document.createElement("div");
    div.className = "fin-item-detail";
    div.innerHTML = `
      <div class="fin-item-detail-inner">
        <div class="fin-detail-row">
          <span class="fin-detail-label">Método de pago</span>
          <span class="fin-detail-value">${item.metodo_pago || "—"}</span>
        </div>
        <div class="fin-detail-row">
          <span class="fin-detail-label">Fecha</span>
          <span class="fin-detail-value">${fechaStr}${item.hora ? ` · ${item.hora.slice(0, 5)}` : ""}</span>
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
    const inner = div.querySelector(".fin-item-detail-inner");
    requestAnimationFrame(() => {
      inner.style.maxHeight = inner.scrollHeight + "px";
    });

    const btns = div.querySelectorAll(".fin-btn-outlined");
    btns[0].addEventListener("click", () => {
      window.location.href = `/pages/admin/finanzas/registrar.html?id=${item.id}`;
    });

    btns[1].addEventListener("click", async () => {
      if (!await showConfirmSnackbar("¿Eliminar este movimiento?")) return;
      const { error } = await sb.from("finanzas_movimientos").delete().eq("id", item.id);
      if (!error) {
        el.remove();
        div.remove();
        window.dispatchEvent(new CustomEvent("fin:refresh"));
      } else {
        showSnackbar("Error al eliminar");
      }
    });
  }

  /* --- CATEGORY ICONS --- */
  const CATEGORY_ICONS = {
    "Gasolina": "local_gas_station",
    "Aceite": "oil_barrel",
    "Mano de obra": "groups",
    "Gas tostadora": "whatshot",
    "Insumos": "eco",
    "Mantenimiento": "build",
    "Empaque": "inventory_2",
    "Tienda": "shopping_bag",
    "Café Trillado": "local_cafe",
    "Café Tostado": "local_fire_department",
    "Café Molido": "blender",
    "Todo en Uno": "all_inclusive",
    "Otros": "more_horiz",
  };

  /* --- FAB SCROLL --- */
  function setupFabScroll() {
    const fab = els.fab();
    if (!fab) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScroll = window.scrollY;
          if (currentScroll > lastScrollY && currentScroll > 100) {
            fab.classList.add("collapsed");
          } else if (currentScroll < lastScrollY || currentScroll < 100) {
            fab.classList.remove("collapsed");
          }
          lastScrollY = currentScroll;
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /* --- INIT --- */
  async function init() {
    const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
    if (!user || user.rol !== "admin") {
      console.warn("📊 Dashboard: usuario no es admin o no encontrado");
      return;
    }

    // Periodo from localStorage
    periodo = localStorage.getItem("fin_periodo") || "semana";

    // Set active segment
    els.segBtns().forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.periodo === periodo);
      btn.addEventListener("click", async () => {
        els.segBtns().forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        periodo = btn.dataset.periodo;
        periodoOffset = 0;
        localStorage.setItem("fin_periodo", periodo);
        await cargarDashboard();
      });
    });

    // Period nav arrows
    document.getElementById("periodo-prev")?.addEventListener("click", async () => {
      periodoOffset--;
      await cargarDashboard();
    });
    document.getElementById("periodo-next")?.addEventListener("click", async () => {
      periodoOffset++;
      await cargarDashboard();
    });

    // Filter chips
    els.filterChips().forEach((chip) => {
      chip.addEventListener("click", () => {
        els.filterChips().forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        filtro = chip.dataset.filter;
        renderHistorial(movimientos);
      });
    });

    // FAB scroll
    setupFabScroll();

    // Load data
    await cargarDashboard();

    // Listen for refresh
    window.addEventListener("fin:refresh", () => cargarDashboard());
  }

  document.addEventListener("DOMContentLoaded", () => init().catch(console.error));
})();
