/* ============================================================
   FINANZAS — DASHBOARD | CAFÉ CORTERO
   ============================================================ */

console.log("📊 finanzas/dashboard.js — INIT");

(() => {
  const sb = window.supabaseClient;
  if (!sb) throw new Error("❌ Supabase no inicializado");

  /* --- STATE --- */
  let periodo = localStorage.getItem("fin_periodo") || "semana";
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
    let desde, hasta, label;

    switch (per) {
      case "dia": {
        desde = new Date(y, m, d);
        hasta = new Date(y, m, d + 1);
        label = desde.toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        break;
      }
      case "semana": {
        const day = now.getDay();
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
    const { desde, hasta } = getRangoFechas(per);
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
      const rango = getRangoFechas(periodo);
      if (els.periodoLabel()) els.periodoLabel().textContent = rango.label;

      const { data } = await awaitQuery(rango.desde, rango.hasta);
      console.log("📊 Dashboard data count:", data?.length);
      movimientos = data;

      const ingresos = data.filter((r) => r.tipo === "ingreso");
      const egresos = data.filter((r) => r.tipo === "egreso");
      const totalIngresos = ingresos.reduce((s, i) => s + Number(i.monto), 0);
      const totalEgresos = egresos.reduce((s, i) => s + Number(i.monto), 0);

      // Stats cards
      if (els.ingresosMonto()) els.ingresosMonto().innerHTML = fmtMontoHTML(totalIngresos);
      if (els.egresosMonto()) els.egresosMonto().innerHTML = fmtMontoHTML(totalEgresos);

      // Saldo
      await renderSaldo(ingresos, egresos, periodo);

      // Chart
      renderChart(data);

      // Historial
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
              <div class="fin-item-concept">${item.concepto}</div>
              <div class="fin-item-categoria">${item.categoria}</div>
            </div>
            <div class="fin-item-trailing ${isIngreso ? "primary" : "error"}">
              ${fmtMontoHTML(item.monto, isIngreso ? "+" : "−")}
            </div>
          </div>`;
        if (idx < grupos[key].length - 1) {
          html += `<div class="fin-item-divider"></div>`;
        }
      });
    });

    container.innerHTML = html;

    // Tap item -> bottom sheet
    container.querySelectorAll(".fin-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        const item = data.find((r) => r.id === id);
        if (item) showBottomSheet(item);
      });
    });
  }

  function showBottomSheet(item) {
    const overlay = document.querySelector(".fin-bottom-sheet-overlay");
    const sheet = document.querySelector(".fin-bottom-sheet");
    if (!overlay || !sheet) return;

    const isIngreso = item.tipo === "ingreso";
    const icon = CATEGORY_ICONS[item.categoria] || (isIngreso ? "trending_up" : "trending_down");

    document.getElementById("bs-icon").textContent = icon;
    document.getElementById("bs-icon").className = `material-symbols-outlined`;
    document.getElementById("bs-concepto").textContent = item.concepto;
    document.getElementById("bs-categoria").textContent = item.categoria;
    document.getElementById("bs-monto").innerHTML = fmtMontoHTML(item.monto, isIngreso ? "+" : "−");
    document.getElementById("bs-monto").style.color = "";
    document.getElementById("bs-fecha").textContent = new Date(item.fecha + "T" + (item.hora || "00:00:00")).toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    document.getElementById("bs-hora").textContent = item.hora ? item.hora.slice(0, 5) : "--:--";
    document.getElementById("bs-notas").textContent = item.notas || "—";

    overlay.classList.add("open");
    sheet.classList.add("open");
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

  /* --- BOTTOM SHEET CLOSE --- */
  function closeBottomSheet() {
    const overlay = document.querySelector(".fin-bottom-sheet-overlay");
    const sheet = document.querySelector(".fin-bottom-sheet");
    if (overlay) overlay.classList.remove("open");
    if (sheet) sheet.classList.remove("open");
  }

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
        localStorage.setItem("fin_periodo", periodo);
        await cargarDashboard();
      });
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

    // Bottom sheet close
    document.querySelector(".fin-bottom-sheet-overlay")?.addEventListener("click", closeBottomSheet);

    // Load data
    await cargarDashboard();

    // Listen for refresh
    window.addEventListener("fin:refresh", () => cargarDashboard());
  }

  document.addEventListener("DOMContentLoaded", () => init().catch(console.error));
})();
