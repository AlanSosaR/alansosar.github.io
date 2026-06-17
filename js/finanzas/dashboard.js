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
  let busqueda = "";
  let pagina = 1;
  const REGS_POR_PAGINA = 5;

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
    ahorroMonto: () => $("#ahorro-monto"),
    ahorroCompare: () => $("#ahorro-compare"),
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

  function showSnackbar(msg, type = "success") {
    const el = document.getElementById("snackbar");
    if (!el) return;
    el.textContent = msg;
    el.className = "snackbar show";
    if (type) el.classList.add(type);
    setTimeout(() => el.classList.remove("show", "success", "error", "warn"), 3500);
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

  function setEmptyText(id, total, refEl) {
    const el = document.getElementById(id);
    if (total > 0) { if (el) el.remove(); return; }
    const msgs = { dia: "hoy", semana: "esta semana", mes: "este mes" };
    if (el) { el.textContent = `Sin movimientos ${msgs[periodo] || ""}`; return; }
    const d = document.createElement("div");
    d.id = id; d.className = "fin-stat-empty";
    d.textContent = `Sin movimientos ${msgs[periodo] || ""}`;
    refEl.after(d);
  }

  function actualizarBadge(saldoActual, ingTotal, egrTotal, ahorroTotal) {
    const el = document.getElementById("saldo-compare");
    const iconEl = document.getElementById("saldo-compare-icon");
    const textEl = document.getElementById("saldo-compare-text");
    if (!el || !iconEl || !textEl) return;

    const saldoInicial = saldoActual - ingTotal + egrTotal + ahorroTotal;
    const diferencia = saldoActual - saldoInicial;

    const pre = { dia: "el día", semana: "la semana", mes: "el mes" }[periodo] || "el día";

    let estado, icono, texto;

    if (diferencia > 0) {
      estado = "positive";
      icono = "trending_up";
      texto = `Iniciaste ${pre} con ${fmtMonto(saldoInicial)} y subiste ${fmtMonto(diferencia)}.`;
    } else if (diferencia < 0) {
      estado = "negative";
      icono = "trending_down";
      texto = `Iniciaste ${pre} con ${fmtMonto(saldoInicial)} y bajaste ${fmtMonto(Math.abs(diferencia))}.`;
    } else {
      estado = "neutral";
      icono = "schedule";
      texto = "El saldo se mantiene igual que al inicio del período.";
    }

    el.className = `fin-saldo-compare ${estado}`;
    iconEl.textContent = icono;
    textEl.textContent = texto;
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
      busqueda = ""; pagina = 1;
      document.getElementById("fin-search-row")?.classList.remove("open");
      const inp = document.getElementById("fin-search-input");
      if (inp) inp.value = "";
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
      const allAhr = allData.filter((r) => r.tipo === "ahorro").reduce((s, r) => s + Number(r.monto), 0);
      if (els.saldoMonto()) els.saldoMonto().innerHTML = fmtMontoHTML(allIng - allEgr - allAhr);

      // Stats cards (period-specific)
      const ingresos = data.filter((r) => r.tipo === "ingreso");
      const egresos = data.filter((r) => r.tipo === "egreso");
      const ahorros = data.filter((r) => r.tipo === "ahorro");
      const ingTotal = ingresos.reduce((s, i) => s + Number(i.monto), 0);
      const egrTotal = egresos.reduce((s, i) => s + Number(i.monto), 0);
      const ahrTotal = ahorros.reduce((s, i) => s + Number(i.monto), 0);
      if (els.ingresosMonto()) els.ingresosMonto().innerHTML = fmtMontoHTML(ingTotal, "", true);
      if (els.egresosMonto()) els.egresosMonto().innerHTML = fmtMontoHTML(egrTotal, "", false);
      if (els.ahorroMonto()) els.ahorroMonto().innerHTML = fmtMontoHTML(ahrTotal, "", true);
      setEmptyText("ingresos-empty", ingTotal, els.ingresosMonto());
      setEmptyText("egresos-empty", egrTotal, els.egresosMonto());
      actualizarBadge(allIng - allEgr - allAhr, ingTotal, egrTotal, ahrTotal);

      // Por cobrar
      await cargarPorCobrar();

      // Chart & historial from filtered data
      renderChart(data);
      renderHistorial(data);
    } catch (err) {
      console.error("📊 Error en cargarDashboard:", err);
      showSnackbar("Error al cargar datos");
    }
  }

  async function cargarPorCobrar() {
    try {
      const { data: orders, error } = await sb
        .from("orders")
        .select("total, payment_method, status, order_number, created_at")
        .neq("status", "cancelled");

      if (error) throw error;

      const porCobrar = (orders || []).filter(o =>
        (o.payment_method === "cash_on_delivery" && ["pending", "preparing", "shipped"].includes(o.status))
        || (o.payment_method === "bank_transfer" && o.status === "pending")
      );

      const total = porCobrar.reduce((s, o) => s + Number(o.total), 0);
      const count = porCobrar.length;

      const montoEl = document.getElementById("porcobrar-monto");
      const countEl = document.getElementById("porcobrar-count");
      const detalleEl = document.getElementById("porcobrar-detalle");

      if (montoEl) montoEl.innerHTML = fmtMontoHTML(total);
      if (countEl) countEl.textContent = count;

      if (detalleEl) {
        if (count === 0) {
          detalleEl.textContent = "Sin pedidos por cobrar";
        } else {
          const cashCount = porCobrar.filter(o => o.payment_method === "cash_on_delivery").length;
          const transCount = porCobrar.filter(o => o.payment_method === "bank_transfer").length;
          const parts = [];
          if (cashCount > 0) parts.push(`Contra entrega: ${cashCount}`);
          if (transCount > 0) parts.push(`Transferencia: ${transCount}`);
          detalleEl.textContent = parts.join(" · ");
        }
      }
    } catch (err) {
      console.error("❌ Error al cargar por cobrar:", err);
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
    else if (filtro === "ahorro") filtered = data.filter((r) => r.tipo === "ahorro");

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
          <span class="material-symbols-outlined">receipt_long</span>
          <div class="fin-empty-title">${q ? "Sin resultados de búsqueda" : "Sin movimientos en este período"}</div>
          <div class="fin-empty-desc">${q ? "Intentá con otros términos" : "Registrá tu primer movimiento"}</div>
        </div>`;
      return;
    }

    const grupos = agruparPorPeriodo(pageItems, periodo);
    let html = "";

    Object.keys(grupos).forEach((key) => {
      html += `<div class="fin-grupo-header">${key}</div>`;
      grupos[key].forEach((item, idx) => {
        const isIngreso = item.tipo === "ingreso";
        const isAhorro = item.tipo === "ahorro";
        const typeClass = isIngreso ? "primary" : isAhorro ? "secondary" : "error";
        const sign = isIngreso ? "+" : isAhorro ? "+" : "−";
        const icon = CATEGORY_ICONS[item.categoria] || (isIngreso ? "trending_up" : isAhorro ? "savings" : "trending_down");
        html += `
          <div class="fin-item" data-id="${item.id}">
            <div class="fin-item-leading ${typeClass}">
              <span class="material-symbols-outlined">${icon}</span>
            </div>
            <div class="fin-item-body">
              <div class="fin-item-head">
                <div class="fin-item-concept">${item.categoria}</div>
                <div class="fin-item-trailing ${typeClass}">
                  ${fmtMontoHTML(item.monto, sign, isIngreso || isAhorro)}
                </div>
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
    "Pedidos en Línea": "orders",
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
        pagina = 1;
        renderHistorial(movimientos);
      });
    });

    // Search toggle
    document.getElementById("btn-search")?.addEventListener("click", () => {
      const row = document.getElementById("fin-search-row");
      const input = document.getElementById("fin-search-input");
      if (!row || !input) return;
      const isOpen = row.classList.toggle("open");
      if (isOpen) { input.focus(); }
      else { busqueda = ""; input.value = ""; pagina = 1; renderHistorial(movimientos); }
    });

    document.getElementById("fin-search-input")?.addEventListener("input", (e) => {
      busqueda = e.target.value;
      pagina = 1;
      renderHistorial(movimientos);
    });

    document.getElementById("fin-search-clear")?.addEventListener("click", () => {
      const input = document.getElementById("fin-search-input");
      if (!input) return;
      input.value = "";
      busqueda = "";
      pagina = 1;
      renderHistorial(movimientos);
      input.focus();
    });

    // Pagination
    document.getElementById("pag-prev")?.addEventListener("click", () => {
      if (pagina > 1) { pagina--; renderHistorial(movimientos); }
    });
    document.getElementById("pag-next")?.addEventListener("click", () => {
      pagina++; renderHistorial(movimientos);
    });

    // Export button
    document.getElementById("btn-exportar")?.addEventListener("click", () => {
      const active = document.querySelector(".fin-filter-chips .fin-chip.active");
      const label = active?.dataset?.filter || "ambos";

      let filtered = movimientos;
      if (label === "ingreso") filtered = movimientos.filter((r) => r.tipo === "ingreso");
      else if (label === "egreso") filtered = movimientos.filter((r) => r.tipo === "egreso");
      else if (label === "ahorro") filtered = movimientos.filter((r) => r.tipo === "ahorro");

      if (filtered.length === 0) { showSnackbar("No hay datos para exportar"); return; }

      const periodoLabel = document.querySelector(".fin-periodo-label")?.textContent || "";
      const parseMonto = (el) => parseFloat((el?.textContent || "0").replace(/[^0-9.,-]/g, "").replace(/,/g, "")) || 0;
      const ingTotal = parseMonto(document.getElementById("ingresos-monto"));
      const egrTotal = parseMonto(document.getElementById("egresos-monto"));
      const ahrTotal = parseMonto(document.getElementById("ahorro-monto"));
      const saldoActual = parseMonto(document.querySelector(".fin-saldo-monto"));

      const rows = [
        ["Reporte de Finanzas - Café Cortero"],
        [`Período: ${periodoLabel}`],
        [`Ingresos Totales: HNL ${ingTotal.toFixed(2)}`, `Egresos Totales: HNL ${egrTotal.toFixed(2)}`, `Ahorro: HNL ${ahrTotal.toFixed(2)}`, `Saldo Actual: HNL ${saldoActual.toFixed(2)}`],
        [],
        ["Fecha Completa", "Tipo", "Categoría", "Descripción / Notas", "Monto"],
      ];

      filtered.forEach((r) => {
        rows.push([
          new Date(r.fecha + "T" + (r.hora || "00:00:00")).toLocaleString("es-HN"),
          r.tipo === "ingreso" ? "Ingreso" : r.tipo === "ahorro" ? "Ahorro" : "Egreso",
          r.categoria,
          r.notas || r.concepto || "",
          Number(r.monto),
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const colCount = rows[4].length;
      const colWidths = [];
      for (let c = 0; c < colCount; c++) {
        let maxLen = 0;
        rows.forEach((r) => {
          const val = r[c] != null ? String(r[c]) : "";
          maxLen = Math.max(maxLen, val.length);
        });
        colWidths.push({ wch: Math.max(maxLen, 10) + 2 });
      }
      ws["!cols"] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historial");
      const map = { ambos: "Ambos", ingreso: "Ingresos", egreso: "Egresos", ahorro: "Ahorro" };
      XLSX.writeFile(wb, `reporte_finanzas_${map[label]}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    });

    // FAB scroll
    setupFabScroll();

    // Load data
    await cargarDashboard();

    // Auto-refresh al volver de otra pestaña/página
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") cargarDashboard();
    });
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) cargarDashboard();
    });
    window.addEventListener("fin:refresh", () => cargarDashboard());
  }

  document.addEventListener("DOMContentLoaded", () => init().catch(console.error));
})();
