/* ============================================================
   FINANZAS — DASHBOARD | CAFÉ CORTERO
   MATERIAL 3 EXPRESSIVE & DONA 360 (HERO ANALYTICS)
   ============================================================ */

console.log("📊 finanzas/dashboard.js — INIT (Material 3 Expressive & Dona 360)");

(() => {
  const sb = window.supabaseClient;
  if (!sb) throw new Error("❌ Supabase no inicializado");

  /* --- STATE --- */
  let periodo = localStorage.getItem("fin_periodo") || "semana";
  let periodoOffset = 0;
  let filtro = "ambos";
  let activeRubro = "all";
  let movimientos = [];
  let busqueda = "";
  let pagina = 1;
  const REGS_POR_PAGINA = 5;

  // Cached calculated totals for synchronization
  let currentTotals = {
    saldoActual: 0,
    ingTotal: 0,
    egrTotal: 0,
    ahrTotal: 0,
    saldoInicial: 0,
    porCobrarTotal: 0,
    porCobrarCount: 0,
  };

  /* --- DOM REFS --- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    segBtns: () => $$(".hero-segmented .fin-seg-btn, .fin-segmented .fin-seg-btn"),
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
    chartCanvas: () => $("#fin-chart"),
    activePill: () => $("#fin-active-pill"),
  };

  /* --- UTILS --- */
  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function fmtSoloNum(n) {
    const num = Number(n) || 0;
    const fixed = num.toFixed(2);
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  function fmtMonto(n) {
    return `HNL ${fmtSoloNum(n)}`;
  }

  function fmtMontoHTML(n, signo, color) {
    const s = signo || "";
    const c = color || "#512615";
    return `${s ? `<span style="margin-right:2px;">${s}</span>` : ""}<span style="font-size:0.8em;opacity:0.8;margin-right:3px;font-family:'JetBrains Mono',monospace;">HNL</span><span style="color:${c};font-weight:700;" class="font-mono">${fmtSoloNum(n)}</span>`;
  }

  function obtenerNombreUsuario() {
    try {
      const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
      return user?.name || user?.email || "Alan Sosa (Admin)";
    } catch { return "Alan Sosa (Admin)"; }
  }

  function showSnackbar(msg, type = "success") {
    let el = document.getElementById("snackbar");
    if (!el) {
      el = document.createElement("div");
      el.id = "snackbar";
      el.className = "snackbar";
      document.body.appendChild(el);
    }
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
    if (el) { el.textContent = `Sin registros ${msgs[periodo] || ""}`; return; }
    if (!refEl) return;
    const d = document.createElement("div");
    d.id = id; d.className = "fin-stat-empty";
    d.style.cssText = "font-size:10.5px;color:#7E9684;margin-top:2px;";
    d.textContent = `Sin registros ${msgs[periodo] || ""}`;
    refEl.after(d);
  }

  /* --- BADGE Y TEXTO COMPARATIVO --- */
  function actualizarBadge(saldoActual, ingTotal, egrTotal, ahorroTotal) {
    const el = document.getElementById("saldo-compare");
    const iconEl = document.getElementById("saldo-compare-icon");
    const badgeEl = document.getElementById("saldo-compare-badge");
    const textEl = document.getElementById("saldo-compare-text");

    const saldoInicial = saldoActual - ingTotal + egrTotal + ahorroTotal;
    const diferencia = saldoActual - saldoInicial;
    const pre = { dia: "el día", semana: "la semana", mes: "el mes" }[periodo] || "el día";

    let estado = "neutral", icono = "schedule", texto = "", badgeText = "+0.00";

    if (diferencia > 0) {
      estado = "positive";
      icono = "trending_up";
      badgeText = `+${fmtMonto(diferencia).replace("HNL ", "")}`;
      texto = `Iniciaste ${pre} con ${fmtMonto(saldoInicial)} y subiste +${fmtMonto(diferencia)}.`;
    } else if (diferencia < 0) {
      estado = "negative";
      icono = "trending_down";
      badgeText = `-${fmtMonto(Math.abs(diferencia)).replace("HNL ", "")}`;
      texto = `Iniciaste ${pre} con ${fmtMonto(saldoInicial)} y bajaste -${fmtMonto(Math.abs(diferencia))}.`;
    } else {
      estado = "neutral";
      icono = "remove";
      badgeText = "0.00";
      texto = `Iniciaste ${pre} con ${fmtMonto(saldoInicial)} y el saldo se mantiene estable.`;
    }

    if (el) el.className = `fin-saldo-compare ${estado}`;
    if (iconEl) iconEl.textContent = icono;
    if (badgeEl) badgeEl.textContent = badgeText;
    if (textEl) textEl.textContent = texto;

    return { estado, icono, texto, diferencia, saldoInicial };
  }

  /* --- DATA QUERY --- */
  async function awaitQuery(desde, hasta) {
    const { data, error } = await sb
      .from("finanzas_movimientos")
      .select("*")
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });

    if (error) {
      console.error("❌ Error query finanzas_movimientos:", error);
      return { data: [] };
    }
    return { data: data || [] };
  }

  /* --- CARGA PRINCIPAL DEL DASHBOARD --- */
  async function cargarDashboard() {
    try {
      busqueda = ""; pagina = 1;
      document.getElementById("fin-search-row")?.classList.remove("open");
      const inp = document.getElementById("fin-search-input");
      if (inp) inp.value = "";
      const rango = getRangoFechas(periodo, periodoOffset);
      if (els.periodoLabel()) els.periodoLabel().textContent = rango.label;

      // Consultas paralelas
      const [periodResult, allResult] = await Promise.all([
        awaitQuery(rango.desde, rango.hasta),
        sb.from("finanzas_movimientos").select("*"),
      ]);

      const { data } = periodResult;
      const allData = allResult?.data || [];
      movimientos = data;

      // Saldo Actual general
      const allIng = allData.filter((r) => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0);
      const allEgr = allData.filter((r) => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
      const allAhr = allData.filter((r) => r.tipo === "ahorro").reduce((s, r) => s + Number(r.monto), 0);
      const saldoActual = allIng - allEgr - allAhr;

      // Totales del período
      const ingresos = data.filter((r) => r.tipo === "ingreso");
      const egresos = data.filter((r) => r.tipo === "egreso");
      const ahorros = data.filter((r) => r.tipo === "ahorro");
      const ingTotal = ingresos.reduce((s, i) => s + Number(i.monto), 0);
      const egrTotal = egresos.reduce((s, i) => s + Number(i.monto), 0);
      const ahrTotal = ahorros.reduce((s, i) => s + Number(i.monto), 0);
      const saldoInicial = saldoActual - ingTotal + egrTotal + ahrTotal;

      // Actualizar centro de la dona (solo monto limpio en JetBrains Mono sin split H/NL)
      const heroSaldoEl = document.getElementById("fin-saldo-monto-hero");
      if (heroSaldoEl) {
        heroSaldoEl.textContent = fmtSoloNum(saldoActual);
      } else if (els.saldoMonto()) {
        els.saldoMonto().textContent = fmtSoloNum(saldoActual);
      }

      // Actualizar tarjetas de KPI 2x2
      if (els.ingresosMonto()) els.ingresosMonto().innerHTML = fmtMontoHTML(ingTotal, "+", "#377b4c");
      if (els.egresosMonto()) els.egresosMonto().innerHTML = fmtMontoHTML(egrTotal, "", "#C62828");
      if (els.ahorroMonto()) els.ahorroMonto().innerHTML = fmtMontoHTML(ahrTotal, "", "#512615");
      setEmptyText("ingresos-empty", ingTotal, els.ingresosMonto());
      setEmptyText("egresos-empty", egrTotal, els.egresosMonto());

      const badgeInfo = actualizarBadge(saldoActual, ingTotal, egrTotal, ahrTotal);

      // Cargar Por Cobrar
      const porCobrarData = await cargarPorCobrar();

      // Guardar totales cacheados
      currentTotals = {
        saldoActual,
        ingTotal,
        egrTotal,
        ahrTotal,
        saldoInicial,
        porCobrarTotal: porCobrarData.total,
        porCobrarCount: porCobrarData.count,
        badgeText: badgeInfo.texto,
      };

      // 1. Renderizar Dona 360 SVG
      renderDonut360();

      // 2. Sincronizar Banner Superior de Categoría Activa
      actualizarActivePill();

      // 3. Renderizar Gráfica de Barras Lun-Dom
      renderChart(data);

      // 4. Renderizar Lista de Historial
      renderHistorial(data);

    } catch (err) {
      console.error("📊 Error en cargarDashboard:", err);
      showSnackbar("Error al cargar datos");
    }
  }

  /* --- CARGAR PEDIDOS POR COBRAR --- */
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

      if (montoEl) montoEl.innerHTML = fmtMontoHTML(total, "", "#F9A825");
      if (countEl) countEl.textContent = count;

      if (detalleEl) {
        if (count === 0) {
          detalleEl.textContent = "Sin pendientes";
        } else {
          const cashCount = porCobrar.filter(o => o.payment_method === "cash_on_delivery").length;
          const transCount = porCobrar.filter(o => o.payment_method === "bank_transfer").length;
          const parts = [];
          if (cashCount > 0) parts.push(`Contra entrega: ${cashCount}`);
          if (transCount > 0) parts.push(`Transfer: ${transCount}`);
          detalleEl.textContent = parts.join(" · ");
        }
      }

      return { total, count };
    } catch (err) {
      console.error("❌ Error al cargar por cobrar:", err);
      return { total: 0, count: 0 };
    }
  }

  /* ============================================================
     1.C GEOMETRÍA ESTRICTA DE LA DONA SVG 360 (CHUNKY PILL ARCS)
     ============================================================ */
  function renderDonut360() {
    const svg = document.getElementById("fin-donut-svg");
    if (!svg) return;

    const { saldoActual, ingTotal, egrTotal, ahrTotal, saldoInicial, porCobrarTotal } = currentTotals;
    const baseMonto = Math.max(0, saldoInicial);

    // Lista de rubros con sus especificaciones de la paleta oficial Café Cortero
    const categories = [
      { id: "ingreso", label: "Ingresos", monto: Math.max(0, ingTotal), color: "#377b4c", icon: "trending_up" },
      { id: "base", label: "Base inicial", monto: baseMonto, color: "#8D6E63", icon: "account_balance" },
      { id: "egreso", label: "Egresos", monto: Math.max(0, egrTotal), color: "#C62828", icon: "trending_down" },
      { id: "ahorro", label: "Ahorro", monto: Math.max(0, ahrTotal), color: "#512615", icon: "savings" },
      { id: "porcobrar", label: "Por cobrar", monto: Math.max(0, porCobrarTotal), color: "#F9A825", icon: "receipt_long" },
    ];

    // Regla matemática obligatoria:
    // Ángulo mínimo de 24° a categorías con 0.00 HNL
    // Grados restantes distribuidos proporcionalmente entre las categorías con saldo positivo
    const MIN_ANGLE = 24;
    const zeroCats = categories.filter(c => c.monto <= 0);
    const positiveCats = categories.filter(c => c.monto > 0);
    const sumPositive = positiveCats.reduce((s, c) => s + c.monto, 0);

    const angles = {};
    if (positiveCats.length === 0) {
      const equalAngle = 360 / categories.length;
      categories.forEach(c => angles[c.id] = equalAngle);
    } else {
      const fixedZeroTotal = zeroCats.length * MIN_ANGLE;
      const remainingDeg = Math.max(categories.length * 10, 360 - fixedZeroTotal);
      const actualZeroAngle = (360 - remainingDeg) / (zeroCats.length || 1);
      zeroCats.forEach(c => angles[c.id] = actualZeroAngle);
      positiveCats.forEach(c => {
        angles[c.id] = (c.monto / sumPositive) * remainingDeg;
      });
    }

    // Geometría SVG estricta:
    // cx = 140, cy = 140, R = 102, stroke-width = 28 (libre interior = 176px)
    const cx = 140;
    const cy = 140;
    const R = 102;

    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians)),
        rad: angleInRadians,
      };
    }

    function describeArc(x, y, radius, startAngle, endAngle) {
      const diff = Math.min(359.99, Math.max(0.01, endAngle - startAngle));
      const start = polarToCartesian(x, y, radius, startAngle);
      const end = polarToCartesian(x, y, radius, startAngle + diff);
      const largeArcFlag = diff > 180 ? 1 : 0;
      return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
    }

    // Micro-iconos SVG en vector 24x24
    const MICRO_ICONS = {
      trending_up: `<path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>`,
      account_balance: `<path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/>`,
      trending_down: `<path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z"/>`,
      savings: `<path d="M19.83 7.5l-2.27-2.27c.07-.42.18-.81.33-1.17.37-.88.16-1.92-.54-2.61a2.12 2.12 0 00-3 0c-.75.75-.92 1.83-.53 2.76-.71.55-1.63.95-2.67 1.14L10 3.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l.95.95C7.38 6.64 5.76 7.9 4.67 9.5 3.03 11.9 2.5 15.02 3.19 18l.81 3.23c.12.48.56.81 1.05.81.65 0 1.15-.56 1.09-1.21L6 19.5c.34-.11.68-.24 1-.39v1.89c0 .55.45 1 1 1s1-.45 1-1v-2.5c1.28-.7 2.45-1.64 3.41-2.77l.6.6v2.67c0 .55.45 1 1 1s1-.45 1-1v-1.67c.73-.97 1.3-2.07 1.66-3.26l2.16-.54c.72-.18 1.17-.92.99-1.64l-.5-2.02c-.1-.4-.36-.72-.72-.89zM13 9.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>`,
      receipt_long: `<path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z"/>`,
    };

    let pathsHtml = "";
    let iconsHtml = "";
    let currentAngle = -90;

    categories.forEach((cat) => {
      const angle = angles[cat.id];
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const arcPath = describeArc(cx, cy, R, startAngle, endAngle);

      // Posición concéntrica del ícono en el centro de la barra
      const midAngle = startAngle + (angle / 2);
      const iconPt = polarToCartesian(cx, cy, R, midAngle);
      const isActive = activeRubro === cat.id;
      const isDimmed = activeRubro !== "all" && !isActive;

      pathsHtml += `
        <g class="fin-donut-pill ${isActive ? 'active-pill-segment' : ''}" data-rubro="${cat.id}" style="${isDimmed ? 'opacity:0.38;' : 'opacity:1;'} cursor:pointer;">
          <!-- 3. Efecto Cápsulas Entrelazadas (Cutout Border stroke 36 con fondo blanco #FFFFFF) -->
          <path d="${arcPath}" fill="none" stroke="#FFFFFF" stroke-width="36" stroke-linecap="round" />
          <!-- Arco de Color del Rubro stroke 28 (o 32 si está activo) -->
          <path d="${arcPath}" fill="none" stroke="${cat.color}" stroke-width="${isActive ? 32 : 28}" stroke-linecap="round" />
        </g>
      `;

      // 4. Micro-ícono visible en cada barra (Capa superior en fin-donut-icons-group para que ningún recorte lo tape)
      const circleFill = isActive ? cat.color : "#FFFFFF";
      const iconFill = isActive ? "#FFFFFF" : cat.color;
      const circleRadius = isActive ? 12.5 : 10.5;
      const strokeWidth = isActive ? 2.5 : 1.8;
      const iconSize = isActive ? 13 : 11;
      const iconOffset = iconSize / 2;

      iconsHtml += `
        <g class="fin-donut-icon-node ${isActive ? 'active-node' : ''}" data-rubro="${cat.id}" style="${isDimmed ? 'opacity:0.5;' : 'opacity:1;'} cursor:pointer;">
          <circle cx="${iconPt.x.toFixed(2)}" cy="${iconPt.y.toFixed(2)}" r="${circleRadius}" fill="${circleFill}" stroke="${isActive ? '#FFFFFF' : cat.color}" stroke-width="${strokeWidth}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));" />
          <svg x="${(iconPt.x - iconOffset).toFixed(2)}" y="${(iconPt.y - iconOffset).toFixed(2)}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="${iconFill}" style="pointer-events:none;">
            ${MICRO_ICONS[cat.icon]}
          </svg>
        </g>
      `;
    });

    svg.innerHTML = `
      <g class="fin-donut-paths-group">${pathsHtml}</g>
      <g class="fin-donut-icons-group">${iconsHtml}</g>
    `;

    // Listeners interactivos sobre los arcos y nodos de iconos de la dona
    svg.querySelectorAll(".fin-donut-pill, .fin-donut-icon-node").forEach((el) => {
      el.addEventListener("click", () => {
        const rubro = el.dataset.rubro;
        seleccionarRubro(activeRubro === rubro ? "all" : rubro);
      });
    });
  }

  /* ============================================================
     1.A BANNER SUPERIOR DE CATEGORÍA ACTIVA & SINCRONIZACIÓN
     ============================================================ */
  function actualizarActivePill() {
    const pill = els.activePill();
    if (!pill) return;

    const iconSym = document.getElementById("active-pill-icon-sym");
    const titleEl = document.getElementById("active-pill-title");
    const subEl = document.getElementById("active-pill-sub");
    const montoEl = document.getElementById("active-pill-monto");
    const clearBtn = document.getElementById("active-pill-clear");

    const { saldoActual, ingTotal, egrTotal, ahrTotal, saldoInicial, porCobrarTotal, porCobrarCount, badgeText } = currentTotals;

    // Limpiar clases de highlight
    pill.classList.remove("highlight-ingreso", "highlight-egreso", "highlight-ahorro", "highlight-porcobrar");

    if (activeRubro === "ingreso") {
      pill.classList.add("highlight-ingreso");
      if (iconSym) iconSym.textContent = "trending_up";
      if (titleEl) titleEl.textContent = "Ingresos · Ventas POS";
      if (subEl) subEl.textContent = `Registrados ${movimientos.filter(r => r.tipo === "ingreso").length} movimientos de ingreso`;
      if (montoEl) montoEl.innerHTML = `<span style="color:#377b4c;">+${fmtMonto(ingTotal)}</span>`;
      if (clearBtn) clearBtn.classList.add("visible");
    } else if (activeRubro === "egreso") {
      pill.classList.add("highlight-egreso");
      if (iconSym) iconSym.textContent = "trending_down";
      if (titleEl) titleEl.textContent = "Egresos · Gastos Operativos";
      if (subEl) subEl.textContent = `Registrados ${movimientos.filter(r => r.tipo === "egreso").length} egresos en el período`;
      if (montoEl) montoEl.innerHTML = `<span style="color:#C62828;">-${fmtMonto(egrTotal)}</span>`;
      if (clearBtn) clearBtn.classList.add("visible");
    } else if (activeRubro === "ahorro") {
      pill.classList.add("highlight-ahorro");
      if (iconSym) iconSym.textContent = "savings";
      if (titleEl) titleEl.textContent = "Ahorro · Reservas";
      if (subEl) subEl.textContent = `Registrados ${movimientos.filter(r => r.tipo === "ahorro").length} apartados en el período`;
      if (montoEl) montoEl.innerHTML = `<span style="color:#512615;">+${fmtMonto(ahrTotal)}</span>`;
      if (clearBtn) clearBtn.classList.add("visible");
    } else if (activeRubro === "porcobrar") {
      pill.classList.add("highlight-porcobrar");
      if (iconSym) iconSym.textContent = "receipt_long";
      if (titleEl) titleEl.textContent = "Por Cobrar · Pedidos Pendientes";
      if (subEl) subEl.textContent = `${porCobrarCount} pedidos pendientes de entrega o cobro`;
      if (montoEl) montoEl.innerHTML = `<span style="color:#F9A825;">${fmtMonto(porCobrarTotal)}</span>`;
      if (clearBtn) clearBtn.classList.add("visible");
    } else if (activeRubro === "base") {
      if (iconSym) iconSym.textContent = "account_balance";
      if (titleEl) titleEl.textContent = "Base Inicial · Saldo Apertura";
      if (subEl) subEl.textContent = "Monto de apertura al comenzar el período seleccionado";
      if (montoEl) montoEl.innerHTML = `<span style="color:#8D6E63;">${fmtMonto(saldoInicial)}</span>`;
      if (clearBtn) clearBtn.classList.add("visible");
    } else {
      // Estado inicial / Ambos / Balance General
      if (iconSym) iconSym.textContent = "account_balance_wallet";
      if (titleEl) titleEl.textContent = "Balance General";
      if (subEl) subEl.textContent = badgeText || "Iniciaste el período con control total.";
      if (montoEl) montoEl.innerHTML = `<span style="color:#377b4c;">${fmtMonto(saldoActual)}</span>`;
      if (clearBtn) clearBtn.classList.remove("visible");
    }

    // Sincronizar clases activas en las tarjetas 2x2
    $$(".fin-kpi-card").forEach((c) => {
      c.classList.toggle("active-kpi", c.dataset.rubro === activeRubro);
    });

    // Sincronizar dinámicamente el centro de la Dona 360
    actualizarCentroDona();
  }

  /* --- ACTUALIZAR CENTRO DE LA DONA SEGÚN RUBRO SELECCIONADO --- */
  function actualizarCentroDona() {
    const labelEl = document.getElementById("fin-donut-center-label");
    const montoEl = document.getElementById("fin-saldo-monto-hero") || els.saldoMonto();
    const compareEl = document.getElementById("saldo-compare");
    const iconEl = document.getElementById("saldo-compare-icon");
    const badgeEl = document.getElementById("saldo-compare-badge");

    const { saldoActual, ingTotal, egrTotal, ahrTotal, saldoInicial, porCobrarTotal, porCobrarCount } = currentTotals;

    if (activeRubro === "ingreso") {
      if (labelEl) labelEl.textContent = "INGRESOS · HNL";
      if (montoEl) {
        montoEl.textContent = `+${fmtSoloNum(ingTotal)}`;
        montoEl.style.setProperty("color", "#377b4c", "important");
      }
      if (compareEl) compareEl.className = "fin-saldo-compare positive";
      if (iconEl) iconEl.textContent = "trending_up";
      const count = movimientos.filter(r => r.tipo === "ingreso").length;
      if (badgeEl) badgeEl.textContent = `${count} ingreso${count !== 1 ? 's' : ''}`;
    } else if (activeRubro === "egreso") {
      if (labelEl) labelEl.textContent = "EGRESOS · HNL";
      if (montoEl) {
        montoEl.textContent = `-${fmtSoloNum(egrTotal)}`;
        montoEl.style.setProperty("color", "#C62828", "important");
      }
      if (compareEl) compareEl.className = "fin-saldo-compare negative";
      if (iconEl) iconEl.textContent = "trending_down";
      const count = movimientos.filter(r => r.tipo === "egreso").length;
      if (badgeEl) badgeEl.textContent = `${count} gasto${count !== 1 ? 's' : ''}`;
    } else if (activeRubro === "ahorro") {
      if (labelEl) labelEl.textContent = "AHORRO · HNL";
      if (montoEl) {
        montoEl.textContent = `${fmtSoloNum(ahrTotal)}`;
        montoEl.style.setProperty("color", "#512615", "important");
      }
      if (compareEl) compareEl.className = "fin-saldo-compare neutral";
      if (iconEl) iconEl.textContent = "savings";
      const count = movimientos.filter(r => r.tipo === "ahorro").length;
      if (badgeEl) badgeEl.textContent = `${count} reserva${count !== 1 ? 's' : ''}`;
    } else if (activeRubro === "porcobrar") {
      if (labelEl) labelEl.textContent = "POR COBRAR · HNL";
      if (montoEl) {
        montoEl.textContent = `${fmtSoloNum(porCobrarTotal)}`;
        montoEl.style.setProperty("color", "#F9A825", "important");
      }
      if (compareEl) compareEl.className = "fin-saldo-compare neutral";
      if (iconEl) iconEl.textContent = "receipt_long";
      if (badgeEl) badgeEl.textContent = `${porCobrarCount} pedido${porCobrarCount !== 1 ? 's' : ''}`;
    } else if (activeRubro === "base") {
      if (labelEl) labelEl.textContent = "BASE INICIAL · HNL";
      if (montoEl) {
        montoEl.textContent = `${fmtSoloNum(saldoInicial)}`;
        montoEl.style.setProperty("color", "#8D6E63", "important");
      }
      if (compareEl) compareEl.className = "fin-saldo-compare neutral";
      if (iconEl) iconEl.textContent = "account_balance";
      if (badgeEl) badgeEl.textContent = "Apertura";
    } else {
      // Estado inicial / Ambos / Balance General
      if (labelEl) labelEl.textContent = "SALDO ACTUAL · HNL";
      if (montoEl) {
        montoEl.textContent = fmtSoloNum(saldoActual);
        montoEl.style.setProperty("color", "#377b4c", "important");
      }
      actualizarBadge(saldoActual, ingTotal, egrTotal, ahrTotal);
    }
  }

  function seleccionarRubro(rubro) {
    activeRubro = rubro;
    actualizarActivePill();
    actualizarCentroDona();
    renderDonut360();

    // Sincronizar con los chips de filtro del historial
    if (rubro === "ingreso") filtro = "ingreso";
    else if (rubro === "egreso") filtro = "egreso";
    else if (rubro === "ahorro") filtro = "ahorro";
    else filtro = "ambos";

    els.filterChips().forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.filter === filtro);
    });

    pagina = 1;
    renderHistorial(movimientos);
  }

  /* ============================================================
     1.B CONMUTADOR DE VISTA (DONA 360 VS BARRAS)
     ============================================================ */
  function setupViewToggle() {
    const btnDonut = document.getElementById("view-btn-donut");
    const btnBar = document.getElementById("view-btn-bar");
    const viewDonut = document.getElementById("fin-donut-view");
    const viewBar = document.getElementById("fin-barchart-view");

    if (!btnDonut || !btnBar) return;

    btnDonut.addEventListener("click", () => {
      btnDonut.classList.add("active");
      btnBar.classList.remove("active");
      if (viewDonut) viewDonut.style.display = "flex";
      if (viewBar) viewBar.style.display = "none";
    });

    btnBar.addEventListener("click", () => {
      btnBar.classList.add("active");
      btnDonut.classList.remove("active");
      if (viewDonut) viewDonut.style.display = "none";
      if (viewBar) viewBar.style.display = "block";
      if (chartInstance) {
        setTimeout(() => chartInstance.resize(), 60);
      }
    });

    // Botón limpiar de la píldora superior
    document.getElementById("active-pill-clear")?.addEventListener("click", () => {
      seleccionarRubro("all");
    });

    // Clicks en las tarjetas 2x2
    $$(".fin-kpi-card").forEach((card) => {
      card.addEventListener("click", () => {
        const r = card.dataset.rubro;
        seleccionarRubro(activeRubro === r ? "all" : r);
      });
    });
  }

  /* --- GRÁFICA DE BARRAS LUN-DOM --- */
  let chartInstance = null;

  function renderChart(data) {
    const canvas = els.chartCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (chartInstance) chartInstance.destroy();

    let labels = [];
    let ingData = [];
    let egrData = [];

    if (periodo === "dia") {
      labels = Array.from({ length: 24 }, (_, i) => {
        const ampm = i >= 12 ? "PM" : "AM";
        const h12 = i % 12 || 12;
        return `${h12} ${ampm}`;
      });
      labels.forEach((_, hh) => {
        const items = data.filter(r => parseInt((r.hora || "00:00").split(":")[0]) === hh);
        ingData.push(items.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0));
        egrData.push(items.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0));
      });
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

    const primaryColor = "#34D399";
    const errorColor = "#F87171";

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Ingresos",
            data: ingData,
            backgroundColor: primaryColor,
            borderRadius: 6,
            barThickness: 10,
          },
          {
            label: "Egresos",
            data: egrData,
            backgroundColor: errorColor,
            borderRadius: 6,
            barThickness: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: "easeOutQuart" },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            align: "center",
            labels: {
              usePointStyle: true,
              font: { family: "Poppins", size: 12 },
              padding: 14,
              color: "#E2E8DC",
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
            ticks: { font: { family: "Poppins", size: 11 }, color: "#A3B899" },
          },
          y: {
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: {
              font: { family: "Poppins", size: 11 },
              color: "#A3B899",
              callback: (v) => fmtMonto(v),
            },
          },
        },
      },
    });
  }

  /* --- HISTORIAL Y RENDER DE MOVIMIENTOS --- */
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
          <div class="fin-empty-desc">${q ? "Intentá con otros términos" : "Registrá tu primer movimiento con el botón +"}</div>
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
          <div class="fin-item" data-id="${item.id}" style="cursor:pointer;">
            <div class="fin-item-leading ${typeClass}">
              <span class="material-symbols-outlined">${icon}</span>
            </div>
            <div class="fin-item-body">
              <div class="fin-item-head">
                <div class="fin-item-concept">${item.categoria || "Movimiento"}</div>
                <div class="fin-item-trailing ${typeClass}">
                  ${fmtMontoHTML(item.monto, sign, isIngreso || isAhorro)}
                </div>
              </div>
              <div class="fin-item-categoria">${item.notas || item.concepto || "Sin notas adicionales"}</div>
            </div>
            <span class="material-symbols-outlined fin-item-chevron">chevron_right</span>
          </div>`;
        if (idx < grupos[key].length - 1) {
          html += `<div class="fin-item-divider"></div>`;
        }
      });
    });

    container.innerHTML = html;

    // Conectar clic para abrir el M3 Bottom Sheet
    container.querySelectorAll(".fin-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        const item = data.find((r) => r.id === id);
        if (item) openMovementBottomSheet(item);
      });
    });
  }

  /* ============================================================
     3. M3 BOTTOM SHEET MODAL (COMPROBANTE & WHATSAPP)
     ============================================================ */
  function numeroALetras(num) {
    const Unidades = (n) => {
      switch (n) {
        case 1: return "UN";
        case 2: return "DOS";
        case 3: return "TRES";
        case 4: return "CUATRO";
        case 5: return "CINCO";
        case 6: return "SEIS";
        case 7: return "SIETE";
        case 8: return "OCHO";
        case 9: return "NUEVE";
        default: return "";
      }
    };

    const Decenas = (n) => {
      let decena = Math.floor(n / 10);
      let unidad = n % 10;
      switch (decena) {
        case 1:
          switch (unidad) {
            case 0: return "DIEZ";
            case 1: return "ONCE";
            case 2: return "DOCE";
            case 3: return "TRECE";
            case 4: return "CATORCE";
            case 5: return "QUINCE";
            default: return "DIECI" + Unidades(unidad);
          }
        case 2:
          if (unidad === 0) return "VEINTE";
          return "VEINTI" + Unidades(unidad);
        case 3: return DecenasY("TREINTA", unidad);
        case 4: return DecenasY("CUARENTA", unidad);
        case 5: return DecenasY("CINCUENTA", unidad);
        case 6: return DecenasY("SESENTA", unidad);
        case 7: return DecenasY("SETENTA", unidad);
        case 8: return DecenasY("OCHENTA", unidad);
        case 9: return DecenasY("NOVENTA", unidad);
        case 0: return Unidades(unidad);
      }
    };

    const DecenasY = (strSin, numUnid) => {
      if (numUnid > 0) return strSin + " Y " + Unidades(numUnid);
      return strSin;
    };

    const Centenas = (n) => {
      let centena = Math.floor(n / 100);
      let decena = n % 100;
      switch (centena) {
        case 1:
          if (decena > 0) return "CIENTO " + Decenas(decena);
          return "CIEN";
        case 2: return "DOSCIENTOS " + Decenas(decena);
        case 3: return "TRESCIENTOS " + Decenas(decena);
        case 4: return "CUATROCIENTOS " + Decenas(decena);
        case 5: return "QUINIENTOS " + Decenas(decena);
        case 6: return "SEISCIENTOS " + Decenas(decena);
        case 7: return "SETECIENTOS " + Decenas(decena);
        case 8: return "OCHOCIENTOS " + Decenas(decena);
        case 9: return "NOVECIENTOS " + Decenas(decena);
        default: return Decenas(decena);
      }
    };

    const Seccion = (n, divisor, strSingular, strPlural) => {
      let cientos = Math.floor(n / divisor);
      let resto = n % divisor;
      let letras = "";
      if (cientos > 0) {
        if (cientos > 1) letras = Centenas(cientos) + " " + strPlural;
        else letras = strSingular;
      }
      if (resto > 0) letras += (letras !== "" ? " " : "") + Centenas(resto);
      return letras;
    };

    const Miles = (n) => {
      let divisor = 1000;
      let cientos = Math.floor(n / divisor);
      let resto = n % divisor;
      let strMiles = Seccion(n, divisor, "MIL", "MIL");
      let strCentenas = Centenas(resto);
      if (strMiles === "") return strCentenas;
      return strMiles + " " + (strCentenas || "");
    };

    const Millones = (n) => {
      let divisor = 1000000;
      let cientos = Math.floor(n / divisor);
      let resto = n % divisor;
      let strMillones = Seccion(n, divisor, "UN MILLON", "MILLONES");
      let strMiles = Miles(resto);
      if (strMillones === "") return strMiles;
      return strMillones + " " + strMiles;
    };

    const enteros = Math.floor(num);
    const centavos = Math.round((num - enteros) * 100);
    const strCentavos = `${centavos.toString().padStart(2, "0")}/100`;

    let letrasEnteros = Millones(enteros).trim();
    if (enteros === 0) letrasEnteros = "CERO";
    if (enteros === 1) return `UN LEMPIRA CON ${strCentavos}`;
    
    return `${letrasEnteros} LEMPIRAS CON ${strCentavos}`;
  }

  async function openMovementBottomSheet(item) {
    const isIngreso = item.tipo === "ingreso";
    const isAhorro = item.tipo === "ahorro";
    const typeClass = isIngreso ? "primary" : isAhorro ? "secondary" : "error";
    const typeLabel = isIngreso ? "Ingreso" : isAhorro ? "Ahorro" : "Egreso";
    const sign = isIngreso ? "+" : isAhorro ? "+" : "−";
    const icon = CATEGORY_ICONS[item.categoria] || (isIngreso ? "trending_up" : isAhorro ? "savings" : "trending_down");

    const fechaObj = new Date(item.fecha + "T" + (item.hora || "00:00:00"));
    const fechaStr = fechaObj.toLocaleDateString("es-HN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const horaStr = item.hora ? item.hora.slice(0, 5) : "";

    const iconEl = document.getElementById("sheet-icon");
    const iconSym = document.getElementById("sheet-icon-sym");
    const badgeEl = document.getElementById("sheet-type-badge");
    const titleEl = document.getElementById("sheet-title");
    const montoEl = document.getElementById("sheet-monto");
    const montosubEl = document.getElementById("sheet-monto-sub");
    const notasEl = document.getElementById("sheet-notas");
    const rowNotas = document.getElementById("sheet-row-notas");
    const fechaEl = document.getElementById("sheet-fecha");
    const metodoEl = document.getElementById("sheet-metodo");
    const usuarioEl = document.getElementById("sheet-usuario");
    const clienteEl = document.getElementById("sheet-cliente");
    const rowCliente = document.getElementById("sheet-row-cliente");

    // Desplegar modal de inmediato para experiencia fluida
    document.getElementById("fin-sheet-backdrop")?.classList.add("active");
    document.getElementById("fin-bottomsheet")?.classList.add("active");
    document.body.style.overflow = "hidden";

    let clienteNombre = null;
    let clienteTelefono = null;
    let clienteEmail = null;
    let clienteDireccion = null;
    let unidadesTexto = null;
    let cantidadComprada = 0;
    let ord = null;
    let oiList = [];

    // 1. Si está vinculado a un pedido (order_id) en la base de datos
    if (item.order_id) {
      try {
        const [orderRes, itemsRes] = await Promise.all([
          sb.from("orders").select("*, users(*), addresses(*)").eq("id", item.order_id).maybeSingle(),
          sb.from("order_items").select("*, products(*)").eq("order_id", item.order_id)
        ]);

        ord = orderRes?.data;
        oiList = itemsRes?.data || [];

        if (ord?.users) {
          if (ord.users.name) clienteNombre = ord.users.name;
          if (ord.users.phone) clienteTelefono = ord.users.phone;
          if (ord.users.email) clienteEmail = ord.users.email;
        }

        if (ord?.addresses) {
          if (!clienteNombre && ord.addresses.full_name) clienteNombre = ord.addresses.full_name;
          if (!clienteTelefono && ord.addresses.phone) clienteTelefono = ord.addresses.phone;
          const parts = [
            ord.addresses.street || ord.addresses.address_line1 || "",
            ord.addresses.city || "",
            ord.addresses.state || "",
            ord.addresses.country || ""
          ].filter(Boolean);
          if (parts.length > 0) clienteDireccion = parts.join(", ");
        }

        if (!clienteNombre && ord?.order_notes) {
          const m = ord.order_notes.match(/(?:cliente|nombre|para):\s*([^\n\r,]+)/i);
          if (m) clienteNombre = m[1].trim();
        }

        if (!clienteTelefono && ord?.order_notes) {
          const m = ord.order_notes.match(/(?:tel|cel|telefono|phone|whatsapp):\s*([+0-9\s-]+)/i);
          if (m) clienteTelefono = m[1].trim();
        }

        // Calcular unidades compradas desde order_items
        if (oiList.length > 0) {
          if (item.product_id) {
            const prodItem = oiList.find(it => it.product_id === item.product_id);
            if (prodItem && prodItem.quantity) {
              cantidadComprada = Number(prodItem.quantity);
            }
          }
          if (!cantidadComprada) {
            cantidadComprada = oiList.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
          }
        }
      } catch (err) {
        console.warn("Aviso al obtener datos de order_id:", err);
      }
    }

    // 2. Si el concepto contiene el nombre (ej. "Pedido #105 — Juan Pérez")
    if (!clienteNombre && item.concepto && item.concepto.includes(" — ")) {
      const parts = item.concepto.split(" — ");
      if (parts.length >= 2 && !parts[1].toLowerCase().includes("bolsa")) {
        clienteNombre = parts[1].trim();
      }
    }

    // 3. Si en las notas del movimiento se especificó el cliente o teléfono
    if (item.notas) {
      if (!clienteNombre && /cliente:\s*([^\n\r,]+)/i.test(item.notas)) {
        const match = item.notas.match(/cliente:\s*([^\n\r,]+)/i);
        if (match) clienteNombre = match[1].trim();
      }
      if (!clienteTelefono && /(?:tel|cel|telefono|phone|whatsapp):\s*([+0-9\s-]+)/i.test(item.notas)) {
        const match = item.notas.match(/(?:tel|cel|telefono|phone|whatsapp):\s*([+0-9\s-]+)/i);
        if (match) clienteTelefono = match[1].trim();
      }
    }

    // 4. Si no se obtuvo de la BD, buscar si las unidades están en el concepto o notas
    if (!cantidadComprada && item.concepto) {
      const m = item.concepto.match(/(\d+)\s*(?:bolsa|unidad|paquete|libra|lb)s?/i);
      if (m) cantidadComprada = parseInt(m[1], 10);
    }
    if (!cantidadComprada && item.notas) {
      const m = item.notas.match(/(?:cant(?:idad)?|unidades?|bolsas?):\s*(\d+)/i) || item.notas.match(/(\d+)\s*(?:bolsa|unidad|paquete|libra|lb)s?/i);
      if (m) cantidadComprada = parseInt(m[1], 10);
    }

    if (cantidadComprada > 0) {
      unidadesTexto = `${cantidadComprada} ${cantidadComprada === 1 ? 'unidad' : 'unidades'}`;
    }

    // Configurar píldora dentro de la caja de monto (Tipo de café + Unidades)
    if (montosubEl) {
      const prodNombre = item.concepto || item.categoria || "Café";
      if (unidadesTexto) {
        montosubEl.innerHTML = `<span>${prodNombre}</span> · <span class="sub-units">${unidadesTexto}</span>`;
      } else {
        montosubEl.innerHTML = `<span>${prodNombre}</span>`;
      }
      montosubEl.style.display = "inline-flex";
    }

    // Configurar visualización del cliente en el Bottom Sheet
    if (rowCliente && clienteEl) {
      if (clienteNombre) {
        clienteEl.textContent = clienteNombre;
        rowCliente.style.display = "flex";
      } else if (item.categoria === "Pedido POS" || item.categoria === "Pedidos en Línea" || item.order_id) {
        clienteEl.textContent = "Cliente Mostrador";
        rowCliente.style.display = "flex";
      } else {
        rowCliente.style.display = "none";
      }
    }

    if (iconEl) iconEl.className = `fin-sheet-icon ${typeClass}`;
    if (iconSym) iconSym.textContent = icon;
    if (badgeEl) {
      badgeEl.className = `fin-sheet-type-badge ${typeClass}`;
      badgeEl.textContent = typeLabel;
    }
    if (titleEl) titleEl.textContent = item.categoria || "Movimiento";
    if (montoEl) {
      montoEl.className = `fin-sheet-monto ${typeClass}`;
      montoEl.textContent = `${sign}${fmtMonto(item.monto)}`;
    }
    if (notasEl) notasEl.textContent = item.notas || "—";
    if (rowNotas) rowNotas.style.display = item.notas ? "flex" : "none";
    if (fechaEl) fechaEl.textContent = `${fechaStr}${horaStr ? ` · ${horaStr}` : ""}`;
    if (metodoEl) metodoEl.textContent = item.metodo_pago || "Efectivo";

    const userName = obtenerNombreUsuario();
    if (usuarioEl) usuarioEl.textContent = userName;

    // === ESTRUCTURA DE FACTURA COMPLETA (ADMIN-FACTURA-IMPRESION.HTML) ===
    const numFactura = ord?.order_number || (item.order_id ? item.order_id.substring(0, 8).toUpperCase() : item.id.substring(0, 8).toUpperCase());
    const finalClientName = clienteNombre || ord?.addresses?.full_name || ord?.users?.name || "Consumidor final";
    const finalPhone = clienteTelefono || ord?.addresses?.phone || ord?.users?.phone || "";
    const finalEmail = clienteEmail || ord?.users?.email || "";
    const finalAddress = clienteDireccion || (ord?.addresses ? [ord.addresses.street, ord.addresses.city].filter(Boolean).join(", ") : "Danlí, El Paraíso, Honduras");

    // Construcción de la lista de productos
    let listaItemsFactura = [];
    if (oiList && oiList.length > 0) {
      listaItemsFactura = oiList.map(it => {
        const prod = it.products || {};
        const q = Number(it.quantity) || 1;
        const p = Number(it.price) || (item.monto / q);
        return {
          quantity: q,
          price: p,
          products: {
            name: prod.name || item.concepto || "Café Cortero",
            presentation: prod.presentation || item.tamano || "Unidad",
            grind_type: prod.grind_type || ""
          }
        };
      });
    } else {
      const q = cantidadComprada > 0 ? cantidadComprada : 1;
      const p = cantidadComprada > 0 ? (item.monto / cantidadComprada) : item.monto;
      listaItemsFactura = [{
        quantity: q,
        price: p,
        products: {
          name: item.concepto || item.categoria || "Café Convencional",
          presentation: item.tamano || "Bolsa",
          grind_type: ""
        }
      }];
    }

    const subtotalCalc = listaItemsFactura.reduce((acc, it) => acc + (it.price * it.quantity), 0) || item.monto;
    const montoTotalCalc = ord?.total ? Number(ord.total) : subtotalCalc;
    const isv15Calc = subtotalCalc * 0.15;
    const envioCalc = (montoTotalCalc > subtotalCalc) ? (montoTotalCalc - subtotalCalc) : 0;
    const letrasTotal = numeroALetras(montoTotalCalc);

    // Objeto compatible con sessionStorage para admin-factura-impresion.html
    const orderForInvoice = {
      id: ord?.id || item.order_id || item.id,
      order_number: numFactura,
      created_at: ord?.created_at || (item.fecha ? `${item.fecha}T${item.hora || '12:00:00'}` : item.created_at),
      status: ord?.status || "confirmed",
      total: montoTotalCalc,
      payment_method: item.metodo_pago || ord?.payment_method || "Efectivo",
      users: {
        name: finalClientName,
        phone: finalPhone,
        email: finalEmail
      },
      address: {
        full_name: finalClientName,
        phone: finalPhone,
        street: finalAddress,
        city: "Danlí",
        state: "El Paraíso",
        country: "Honduras"
      },
      items: listaItemsFactura
    };

    // Guardar en sessionStorage para que admin-factura-impresion.html cargue de inmediato
    sessionStorage.setItem("printOrderData", JSON.stringify(orderForInvoice));

    // BOTÓN "VER FACTURA" (ABRE ADMIN-FACTURA-IMPRESION.HTML)
    const facturaBtn = document.getElementById("sheet-btn-factura");
    if (facturaBtn) {
      facturaBtn.onclick = () => {
        sessionStorage.setItem("printOrderData", JSON.stringify(orderForInvoice));
        window.open(`/pages/admin/admin-factura-impresion.html?order_id=${orderForInvoice.id}`, '_blank');
      };
    }

    // BOTÓN DIRECTO PARA COMPARTIR FACTURA OFICIAL POR WHATSAPP
    const waBtn = document.getElementById("sheet-btn-whatsapp");
    if (waBtn) {
      waBtn.onclick = () => {
        // Guardar por si abren el link en la misma sesión
        sessionStorage.setItem("printOrderData", JSON.stringify(orderForInvoice));

        // Formatear líneas de productos idénticas a la tabla de admin-factura-impresion.html
        const prodsText = listaItemsFactura.map(it => {
          const p = it.products || {};
          const desc = [p.presentation, p.grind_type].filter(Boolean).join(" • ");
          const lineTot = it.quantity * it.price;
          return `• *${it.quantity}x* ${p.name || 'Café'}${desc ? ` (${desc})` : ''} — *L ${fmtMonto(lineTot)}*\n   _Precio unitario: L ${fmtMonto(it.price)}_`;
        }).join('\n');

        const invoiceUrl = `${window.location.origin}/pages/admin/admin-factura-impresion.html?order_id=${orderForInvoice.id}`;

        const msg = [
          `☕ *CAFÉ CORTERO* 🧾`,
          `📍 Danlí, El Paraíso, Honduras`,
          `📋 *RTN:* 05019654135885`,
          `📄 *FACTURA N°:* ${numFactura}`,
          `📋 *Original:* Cliente`,
          `────────────────────────`,
          `👤 *CLIENTE:* ${finalClientName}`,
          finalPhone ? `📞 *Teléfono:* ${finalPhone}` : null,
          finalEmail ? `✉️ *Email:* ${finalEmail}` : null,
          finalAddress ? `🏠 *Dirección:* ${finalAddress}` : null,
          `────────────────────────`,
          `📅 *Fecha de emisión:* ${fechaStr}${horaStr ? ` · ${horaStr}` : ''}`,
          `📍 *Lugar:* Danlí, Honduras`,
          `✅ *Documento Válido — Operación autorizada por el SAR*`,
          `────────────────────────`,
          `📦 *DETALLE DE PRODUCTOS:*`,
          prodsText,
          `────────────────────────`,
          `📝 *TOTAL EN LETRAS:*`,
          `_${letrasTotal}_`,
          `────────────────────────`,
          `📊 *DESGLOSE FISCAL:*`,
          `• Descuento: -L 0.00`,
          `• Importe Exento: L 0.00`,
          `• Importe Exonerado: L 0.00`,
          `• Importe Gravado 15%: L ${fmtMonto(subtotalCalc)}`,
          `• ISV (15%): L ${fmtMonto(isv15Calc)}`,
          envioCalc > 0 ? `• Envío: L ${fmtMonto(envioCalc)}` : null,
          `────────────────────────`,
          `💰 *TOTAL A PAGAR: L ${fmtMonto(montoTotalCalc)}*`,
          `💳 *Método de pago:* ${item.metodo_pago || ord?.payment_method || 'Efectivo'}`,
          `────────────────────────`,
          `🏛️ *DATOS SAR:*`,
          `• *Rango Autorizado:* 6549864654-00000001 al 6549864654-00000100`,
          `• *Fecha Límite de Emisión:* 2025-12-31`,
          `• *CAI:* 3AE914-B7C623-5D8B2F-40FD9A-8721BC-4E`,
          `• *Lugar de Emisión:* Danlí, El Paraíso, Honduras`,
          `────────────────────────`,
          `🌐 *Ver / Descargar Factura Digital:*`,
          `${invoiceUrl}`,
          `────────────────────────`,
          `☕ _Cosechado en Honduras • Tostado con Alma_`,
          `📞 Dudas o pedidos: +504 9667-0613 / 9867-5101`,
          `✉️ cafecortero@gmail.com`
        ].filter(Boolean).join('\n');

        // Si tenemos teléfono del cliente, enviar directo a su número
        let cleanPhone = (finalPhone || "").replace(/\D/g, "");
        if (cleanPhone.length === 8) cleanPhone = `504${cleanPhone}`;
        const waLink = (cleanPhone.length >= 8) 
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
          : `https://wa.me/?text=${encodeURIComponent(msg)}`;

        window.open(waLink, '_blank');
      };
    }

    // BOTÓN EDITAR
    const editBtn = document.getElementById("sheet-btn-edit");
    if (editBtn) {
      editBtn.onclick = () => {
        window.location.href = `/pages/admin/finanzas/registrar.html?id=${item.id}`;
      };
    }

    // BOTÓN ELIMINAR
    const deleteBtn = document.getElementById("sheet-btn-delete");
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        closeMovementBottomSheet();
        if (!await showConfirmSnackbar("¿Eliminar este movimiento?")) return;
        const { error } = await sb.from("finanzas_movimientos").delete().eq("id", item.id);
        if (!error) {
          showSnackbar("Movimiento eliminado");
          window.dispatchEvent(new CustomEvent("fin:refresh"));
        } else {
          showSnackbar("Error al eliminar");
        }
      };
    }

    // Desplegar modal
    document.getElementById("fin-sheet-backdrop")?.classList.add("active");
    document.getElementById("fin-bottomsheet")?.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeMovementBottomSheet() {
    document.getElementById("fin-sheet-backdrop")?.classList.remove("active");
    document.getElementById("fin-bottomsheet")?.classList.remove("active");
    document.body.style.overflow = "";
  }

  function setupBottomSheetListeners() {
    document.getElementById("sheet-close-btn")?.addEventListener("click", closeMovementBottomSheet);
    document.getElementById("fin-sheet-backdrop")?.addEventListener("click", closeMovementBottomSheet);

    // Cerrar con Escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMovementBottomSheet();
    });

    // Soporte táctil para drag handle
    const sheet = document.getElementById("fin-bottomsheet");
    if (!sheet) return;

    let startY = 0;
    let currentTranslate = 0;

    sheet.addEventListener("touchstart", (e) => {
      if (sheet.scrollTop > 0) return;
      startY = e.touches[0].clientY;
    }, { passive: true });

    sheet.addEventListener("touchmove", (e) => {
      if (sheet.scrollTop > 0) return;
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - startY;
      if (deltaY > 0) {
        currentTranslate = deltaY;
        sheet.style.transform = `translateY(${deltaY}px)`;
      }
    }, { passive: true });

    sheet.addEventListener("touchend", () => {
      if (currentTranslate > 120) {
        closeMovementBottomSheet();
      }
      sheet.style.transform = "";
      currentTranslate = 0;
    });
  }

  /* --- MAPEO DE ICONOS DE CATEGORÍAS --- */
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
    "Pedido POS": "point_of_sale",
    "Otros": "more_horiz",
  };

  /* --- FAB SCROLL INTERACTION --- */
  function setupFabScroll() {
    const fab = els.fab();
    if (!fab) return;

    let ticking = false;

    const getScrollTop = () => {
      return (
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      );
    };

    const updateFabState = () => {
      const currentScroll = getScrollTop();
      // Al hacer scroll hacia abajo (>15px del tope), el FAB DEBE mantenerse colapsado
      // para que no se abra ni estorbe en la lectura de los datos.
      if (currentScroll > 15) {
        fab.classList.add("collapsed");
      } else {
        // Solo cuando se está completamente arriba en el tope inicial se muestra expandido
        fab.classList.remove("collapsed");
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateFabState);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Inicializar estado inmediatamente
    updateFabState();
  }

  /* --- INICIALIZACIÓN --- */
  async function init() {
    const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
    if (!user || user.rol !== "admin") {
      console.warn("📊 Dashboard: usuario no es admin o no encontrado");
      return;
    }

    periodo = localStorage.getItem("fin_periodo") || "semana";

    // Segmentos de Período (Día / Semana / Mes)
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

    // Flechas de navegación de período
    document.getElementById("periodo-prev")?.addEventListener("click", async () => {
      periodoOffset--;
      await cargarDashboard();
    });
    document.getElementById("periodo-next")?.addEventListener("click", async () => {
      periodoOffset++;
      await cargarDashboard();
    });

    // Chips de filtro horizontal
    els.filterChips().forEach((chip) => {
      chip.addEventListener("click", () => {
        els.filterChips().forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        filtro = chip.dataset.filter;
        activeRubro = filtro === "ambos" ? "all" : filtro;
        actualizarActivePill();
        renderDonut360();
        pagina = 1;
        renderHistorial(movimientos);
      });
    });

    // Barra de búsqueda
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

    // Paginación
    document.getElementById("pag-prev")?.addEventListener("click", () => {
      if (pagina > 1) { pagina--; renderHistorial(movimientos); }
    });
    document.getElementById("pag-next")?.addEventListener("click", () => {
      pagina++; renderHistorial(movimientos);
    });

    // Exportación a Excel
    document.getElementById("btn-exportar")?.addEventListener("click", () => {
      const active = document.querySelector(".fin-filter-chips .fin-chip.active");
      const label = active?.dataset?.filter || "ambos";

      let filtered = movimientos;
      if (label === "ingreso") filtered = movimientos.filter((r) => r.tipo === "ingreso");
      else if (label === "egreso") filtered = movimientos.filter((r) => r.tipo === "egreso");
      else if (label === "ahorro") filtered = movimientos.filter((r) => r.tipo === "ahorro");

      if (filtered.length === 0) { showSnackbar("No hay datos para exportar"); return; }

      const periodoLabel = document.querySelector(".fin-periodo-label")?.textContent || "";
      const { ingTotal, egrTotal, ahrTotal, saldoActual } = currentTotals;

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

    // Conmutador de Vistas y Bottom Sheet
    setupViewToggle();
    setupBottomSheetListeners();

    // FAB scroll
    setupFabScroll();

    // Cargar dashboard
    await cargarDashboard();

    // Eventos de reactivación / refresh
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
