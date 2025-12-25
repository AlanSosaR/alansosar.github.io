/* ============================================================
   Mis pedidos — Café Cortero 2025
   SOLO LÓGICA (SIN HEADER / SIN DRAWER)
============================================================ */

console.log("📦 mis-pedidos.js — INIT");

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
   MAPEO DE STATUS → PROGRESO
   (alineado con recibo.js)
----------------------------------------------------------- */
function mapStatusToSteps(status) {
  switch (status) {
    case "payment_review":      // Pago en revisión
      return 2;
    case "payment_confirmed":   // Pago confirmado
      return 3;
    case "cash_on_delivery":    // Pago en efectivo
      return 3;
    case "processing":          // En ejecución
      return 3;
    case "shipped":             // Enviado
      return 4;
    case "delivered":           // Entregado
      return 4;
    default:
      return 1;                 // Pendiente
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
     Sesión
  ------------------------------------------------------- */
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData?.session) {
    mostrarVacio();
    return;
  }

  const userId = sessionData.session.user.id;

  /* -------------------------------------------------------
     CONSULTA REAL (TABLA CORRECTA)
  ------------------------------------------------------- */
  const { data: pedidos, error } = await sb
    .from("orders")                // ✅ TABLA CORRECTA
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando pedidos:", error);
    mostrarVacio();
    return;
  }

  if (!pedidos || pedidos.length === 0) {
    mostrarVacio();
    return;
  }

  /* -------------------------------------------------------
     HAY PEDIDOS
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

    /* -------- Estado -------- */
    const label = formatStatusLabel(pedido.status);
    clone.querySelector(".estado-text").textContent = label;

    /* -------- Progreso -------- */
    const stepsActivos = mapStatusToSteps(pedido.status);
    const steps = clone.querySelectorAll(".step");
    const lines = clone.querySelectorAll(".line");

    steps.forEach((step, i) => {
      if (i < stepsActivos) step.classList.add("active");
    });

    lines.forEach((line, i) => {
      if (i < stepsActivos - 1) line.classList.add("active");
    });

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
   SINCRONIZAR CON HEADER
----------------------------------------------------------- */
document.addEventListener("header:ready", () => {
  console.log("🧩 header listo → cargar pedidos");
  renderPedidos();
});

/* -----------------------------------------------------------
   INIT FALLBACK
----------------------------------------------------------- */
renderPedidos();
