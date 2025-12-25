/* ============================================================
   Mis pedidos — Café Cortero 2025
   SOLO LÓGICA (SIN HEADER / SIN DRAWER)
============================================================ */

console.log("📦 mis-pedidos.js — PROGRESO AVANZADO");

/* -----------------------------------------------------------
   Helpers
----------------------------------------------------------- */
function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

function formatFecha(fechaISO) {
  const d = new Date(fechaISO);
  return d.toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

/* -----------------------------------------------------------
   MAPEO DE STATUS → ETAPAS VISUALES
   (coincide con recibo.js)
----------------------------------------------------------- */
function mapStatusToProgress(status) {
  /*
    Orden visual:
    0 → pago
    1 → revision
    2 → confirmado
    3 → envio
  */

  switch (status) {
    case "payment_review":
      return 1; // pago → revisión
    case "payment_confirmed":
    case "cash_on_delivery":
    case "processing":
      return 2; // confirmado
    case "shipped":
    case "delivered":
      return 3; // envío
    default:
      return 0; // pendiente de pago
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

  /* -------------------------------------------------------
     Validar sesión
  ------------------------------------------------------- */
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData?.session) {
    mostrarVacio();
    return;
  }

  const userId = sessionData.session.user.id;

  /* -------------------------------------------------------
     Consultar pedidos reales
  ------------------------------------------------------- */
  const { data: pedidos, error } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !pedidos || pedidos.length === 0) {
    console.warn("ℹ️ Sin pedidos");
    mostrarVacio();
    return;
  }

  /* -------------------------------------------------------
     Mostrar pedidos
  ------------------------------------------------------- */
  emptyState.classList.add("hidden");
  if (seguirBack) seguirBack.style.display = "flex";

  pedidos.forEach(pedido => {
    const clone = template.content.cloneNode(true);

    clone.querySelector(".pedido-numero").textContent =
      `Pedido #${pedido.order_number}`;

    clone.querySelector(".pedido-fecha").textContent =
      formatFecha(pedido.created_at);

    clone.querySelector(".pedido-total").textContent =
      `Total: L ${Number(pedido.total).toFixed(2)}`;

    clone.querySelector(".estado-text").textContent =
      formatStatusLabel(pedido.status);

    /* -------- Progreso visual -------- */
    const etapa = mapStatusToProgress(pedido.status);
    applyProgressColors(clone, etapa);

    /* -------- Ver recibo -------- */
    clone.querySelector(".ver-recibo").addEventListener("click", () => {
      location.href = `recibo.html?id=${pedido.id}`;
    });

    lista.appendChild(clone);
  });

  /* -------------------------------------------------------
     Estado vacío
  ------------------------------------------------------- */
  function mostrarVacio() {
    lista.innerHTML = "";
    emptyState.classList.remove("hidden");
    if (seguirBack) seguirBack.style.display = "none";
  }
}

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
document.addEventListener("header:ready", renderPedidos);
renderPedidos();
