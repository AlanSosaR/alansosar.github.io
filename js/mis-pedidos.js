/* ============================================================
   Mis pedidos — Café Cortero 2025
   SOLO LÓGICA (SIN HEADER / SIN DRAWER)
============================================================ */

console.log("📦 mis-pedidos.js — PROGRESO AVANZADO + ICONOS MATERIAL 3");

/* -----------------------------------------------------------
   Helpers
----------------------------------------------------------- */
function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

/* -----------------------------------------------------------
   MAPEO DE STATUS → ETAPAS VISUALES
----------------------------------------------------------- */
function mapStatusToProgress(status) {
  switch (status) {
    case "payment_review":
      return 1;
    case "payment_confirmed":
    case "cash_on_delivery":
    case "processing":
      return 2;
    case "shipped":
    case "delivered":
      return 3;
    default:
      return 0;
  }
}

function formatStatusLabel(status) {
  const map = {
    payment_review: "Pago en revisión",
    payment_confirmed: "Pago confirmado",
    cash_on_delivery: "Pago contra entrega",
    processing: "En ejecución",
    shipped: "Enviado",
    delivered: "Entregado"
  };
  return map[status] || "Pendiente de pago";
}

/* -----------------------------------------------------------
   ICONOS MATERIAL 3 POR ESTADO
----------------------------------------------------------- */
const statusIconMap = {
  payment_review: "fact_check",
  payment_confirmed: "verified",
  cash_on_delivery: "payments",
  processing: "autorenew",
  shipped: "local_shipping",
  delivered: "done_all",
  default: "payments"
};

/* -----------------------------------------------------------
   APLICAR COLORES AL PROGRESO
----------------------------------------------------------- */
function applyProgressColors(container, etapa) {
  const steps = container.querySelectorAll(".step");
  const lines = container.querySelectorAll(".line");

  const clases = ["pago", "revision", "confirmado", "envio"];

  steps.forEach((step, i) => {
    step.classList.remove(...clases);
    if (i <= etapa) step.classList.add(clases[i]);
  });

  lines.forEach((line, i) => {
    line.classList.remove(...clases);
    if (i < etapa) line.classList.add(clases[i]);
  });
}

/* -----------------------------------------------------------
   RENDER PEDIDOS
----------------------------------------------------------- */
async function renderPedidos() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const lista      = document.getElementById("pedidos-lista");
  const emptyState = document.getElementById("empty-state");
  const seguirBack = document.querySelector(".seguir-comprando");
  const template   = document.getElementById("pedido-template");

  if (!lista || !template) return;

  lista.innerHTML = "";

  /* ---------------- Validar sesión ---------------- */
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData?.session) {
    mostrarVacio();
    return;
  }

  const userId = sessionData.session.user.id;

  /* ---------------- Consultar pedidos ---------------- */
  const { data: pedidos, error } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !pedidos || pedidos.length === 0) {
    mostrarVacio();
    return;
  }

  emptyState.classList.add("hidden");
  if (seguirBack) seguirBack.style.display = "flex";

  /* ===================================================
     🔑 FOR...OF (PERMITE AWAIT)
  =================================================== */
  for (const pedido of pedidos) {

    const clone = template.content.cloneNode(true);

    /* -------- Número -------- */
    clone.querySelector(".pedido-numero").textContent =
      `Pedido N.º ${String(pedido.order_number).padStart(3, "0")}`;

    /* -------- Fecha y hora -------- */
    const fecha = new Date(pedido.created_at);

    clone.querySelector("#fechaPedido").textContent =
      fecha.toLocaleDateString("es-HN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

    clone.querySelector("#horaPedido").textContent =
      fecha.toLocaleTimeString("es-HN", {
        hour: "2-digit",
        minute: "2-digit"
      });

    /* -------- Total de cafés -------- */
    const { data: items, error: itemsError } = await sb
      .from("order_items")
      .select("quantity")
      .eq("order_id", pedido.id);

    if (itemsError) {
      console.error("❌ Error cargando cafés:", itemsError);
    }

    const totalCafes =
      items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

    const countEl = clone.querySelector(".pedido-count");
    if (countEl) {
      countEl.textContent =
        `(${totalCafes} café${totalCafes !== 1 ? "s" : ""})`;
    }

    /* -------- Total -------- */
    clone.querySelector(".pedido-total-valor").textContent =
      `L ${Number(pedido.total).toFixed(2)}`;

    /* -------- Estado -------- */
    clone.querySelector(".estado-text").textContent =
      formatStatusLabel(pedido.status);

    const etapa = mapStatusToProgress(pedido.status);
    applyProgressColors(clone, etapa);

    const estadoEl = clone.querySelector(".estado");
    const iconEl   = clone.querySelector(".estado-icon");

    estadoEl.classList.remove("pago", "revision", "confirmado", "envio");

    const clases = ["pago", "revision", "confirmado", "envio"];
    if (clases[etapa]) estadoEl.classList.add(clases[etapa]);

    iconEl.textContent =
      statusIconMap[pedido.status] || statusIconMap.default;

    /* -------- Ver recibo -------- */
    clone.querySelector(".ver-recibo").addEventListener("click", () => {
      location.href = `recibo.html?id=${pedido.id}`;
    });

    lista.appendChild(clone);
  }
}

/* -----------------------------------------------------------
   ESTADO VACÍO
----------------------------------------------------------- */
function mostrarVacio() {
  const lista      = document.getElementById("pedidos-lista");
  const emptyState = document.getElementById("empty-state");
  const seguirBack = document.querySelector(".seguir-comprando");

  if (lista) lista.innerHTML = "";
  emptyState?.classList.remove("hidden");
  if (seguirBack) seguirBack.style.display = "none";
}

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
document.addEventListener("header:ready", renderPedidos);
renderPedidos();
