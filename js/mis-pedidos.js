/* ============================================================
   Mis pedidos — Café Cortero 2025
   SOLO LÓGICA DE PEDIDOS (SIN HEADER / SIN DRAWER)
============================================================ */

/* -----------------------------------------------------------
   Helpers
----------------------------------------------------------- */
function getSupabaseClient() {
  return window.supabaseClient || window.supabase || null;
}

function formatFecha(fechaISO) {
  const d = new Date(fechaISO);
  return d.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* -----------------------------------------------------------
   MAPEO DE ESTADOS → PROGRESO
----------------------------------------------------------- */
function mapEstadoToSteps(estado) {
  // pasos: Pago → Revisión → Confirmado → Envío
  const map = {
    "Pendiente de pago": 1,
    "Pago en revisión": 2,
    "Pago confirmado": 3,
    "En ejecución": 3,
    "Enviado": 4,
    "Entregado": 4
  };
  return map[estado] || 1;
}

/* -----------------------------------------------------------
   RENDER DE PEDIDOS + ESTADO VACÍO
----------------------------------------------------------- */
async function renderPedidos() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const lista       = document.getElementById("pedidos-lista");
  const emptyState  = document.getElementById("empty-state");
  const seguirBack  = document.querySelector(".seguir-comprando");
  const template    = document.getElementById("pedido-template");

  if (!lista || !template) return;

  lista.innerHTML = "";

  /* -------------------------------------------------------
     Validar sesión
  ------------------------------------------------------- */
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData?.session) {
    // sin sesión → no hay pedidos visibles
    mostrarVacio();
    return;
  }

  const userId = sessionData.session.user.id;

  /* -------------------------------------------------------
     Consultar pedidos
  ------------------------------------------------------- */
  const { data: pedidos, error } = await sb
    .from("pedidos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando pedidos:", error);
    mostrarVacio();
    return;
  }

  /* -------------------------------------------------------
     Estado vacío
  ------------------------------------------------------- */
  if (!pedidos || pedidos.length === 0) {
    mostrarVacio();
    return;
  }

  /* -------------------------------------------------------
     Hay pedidos
  ------------------------------------------------------- */
  emptyState.classList.add("hidden");
  if (seguirBack) seguirBack.style.display = "flex";

  pedidos.forEach(pedido => {
    const clone = template.content.cloneNode(true);

    clone.querySelector(".pedido-numero").textContent =
      `Pedido #${pedido.id}`;

    clone.querySelector(".pedido-fecha").textContent =
      formatFecha(pedido.created_at);

    clone.querySelector(".pedido-total").textContent =
      `Total: L ${Number(pedido.total).toFixed(2)}`;

    /* -------- Estado -------- */
    clone.querySelector(".estado-text").textContent = pedido.estado;

    /* -------- Progreso -------- */
    const stepsActivos = mapEstadoToSteps(pedido.estado);
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
     Helpers locales
  ------------------------------------------------------- */
  function mostrarVacio() {
    lista.innerHTML = "";
    emptyState.classList.remove("hidden");
    if (seguirBack) seguirBack.style.display = "none";
  }
}

/* -----------------------------------------------------------
   SINCRONIZAR CUANDO HEADER ESTÉ LISTO
----------------------------------------------------------- */
document.addEventListener("header:ready", () => {
  console.log("🧾 header listo → cargando mis pedidos");
  renderPedidos();
});

/* -----------------------------------------------------------
   INIT (fallback por si header ya cargó)
----------------------------------------------------------- */
renderPedidos();
