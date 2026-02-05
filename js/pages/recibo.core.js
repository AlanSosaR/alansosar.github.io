/**
 * 🧾 recibo.core.js — FINAL DEFINITIVO ESTABLE
 * Proyecto: Café Cortero — Material 3 Expressive
 */

console.log("🧾 recibo.core.js — READY");

/* =========================================================
   HELPERS & CONTEXTO
========================================================= */
const $id = (id) => document.getElementById(id);

window.ORDER_ID = new URLSearchParams(window.location.search).get("id");
window.IS_READ_ONLY = Boolean(window.ORDER_ID);

/* =========================================================
   SUPABASE & SESIÓN
========================================================= */
window.esperarSupabase = () =>
  new Promise((resolve) => {
    if (window.supabaseClient) return resolve();
    const i = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(i);
        resolve();
      }
    }, 50);
  });

window.getUserCache = () => {
  try {
    const u = localStorage.getItem("cortero_user");
    if (u) return JSON.parse(u);

    const key = Object.keys(localStorage).find((k) =>
      k.includes("-auth-token")
    );
    if (key) {
      const s = JSON.parse(localStorage.getItem(key));
      return s?.user || null;
    }
    return null;
  } catch {
    return null;
  }
};

window.showSnack = (msg, duration = 4000) => {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `<span class="snack-text">${msg}</span>`;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), duration);
};

/* =========================================================
   CANCELACIÓN
========================================================= */
function mostrarConfirmacionCancelacion(pedido) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <span class="snack-text">
        ¿Deseas cancelar el pedido <strong>#${pedido.order_number}</strong>?
      </span>
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button id="snack-no">No</button>
        <button id="snack-si" style="background:#ff4436;color:#fff">
          Sí, cancelar
        </button>
      </div>
    </div>
  `;

  bar.classList.add("show");

  $id("snack-no").onclick = () => bar.classList.remove("show");
  $id("snack-si").onclick = async () => {
    bar.classList.remove("show");
    await ejecutarCancelacion(pedido);
  };
}

async function ejecutarCancelacion(pedido) {
  const sb = window.supabaseClient;
  const user = window.getUserCache();
  if (!sb || !pedido || !user) return;

  const { error } = await sb
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", pedido.id);

  if (error) {
    showSnack("No se pudo cancelar el pedido");
    return;
  }

  pedido.status = "cancelled";
  aplicarProgresoPedido("cancelled");
  showSnack("Pedido cancelado correctamente");

  document.querySelector(".btn-cancelar")?.remove();
}

/* =========================================================
   UI — RECIBO
========================================================= */
window.aplicarModoRecibo = (pedido) => {
  document.querySelector(".pago-select-label")?.remove();
  document.querySelector(".btn-cancelar")?.remove();

  if (pedido.status === "pending") {
    const btn = $id("btnCancelarPedido");
    if (btn) {
      btn.onclick = () => mostrarConfirmacionCancelacion(pedido);
    }
  }
};

/* =========================================================
   ESTADO — PÍLDORA
========================================================= */
window.aplicarProgresoPedido = (status) => {
  const el = $id("estado-pildora-container");
  if (!el) return;

  const map = {
    pending: ["Pendiente", "payments"],
    payment_review: ["Revisando pago", "fact_check"],
    processing: ["En preparación", "coffee"],
    shipped: ["En camino", "local_shipping"],
    delivered: ["Entregado", "check_circle"],
    cancelled: ["Cancelado", "cancel"],
  };

  const [label, icon] = map[status] || map.pending;

  el.innerHTML = `
    <div class="status-pill">
      <span class="material-symbols-outlined">${icon}</span>
      <span>${label}</span>
    </div>
  `;
};

/* =========================================================
   CARGA DE PEDIDO
========================================================= */
window.cargarPedidoExistente = async (orderId) => {
  await esperarSupabase();
  const sb = window.supabaseClient;

  const { data: pedido, error } = await sb
    .from("orders")
    .select(
      `*, users(name,email,phone),
       addresses(state,city,street),
       order_items(quantity,price,products(name)),
       payment_receipts(file_url)`
    )
    .eq("id", orderId)
    .single();

  if (error || !pedido) {
    showSnack("Pedido no encontrado");
    return;
  }

  $id("numeroPedido").textContent = pedido.order_number;
  $id("totalPedido").textContent = pedido.total.toFixed(2);

  /* ===============================
     COMPROBANTE
  ================================ */
  if (window.IS_READ_ONLY) {
    const img = $id("imgComprobante");
    const preview = $id("previewComprobante");

    const receipt = pedido.payment_receipts?.[0]?.file_url;
    const isCash = ["cash", "cash_on_delivery"].includes(
      pedido.payment_method
    );

    img.src = isCash
      ? "/imagenes/pago_en_mano.svg"
      : receipt || "/imagenes/recibo_default.svg";

    preview.classList.remove("hidden");
  }

  aplicarProgresoPedido(pedido.status);
  aplicarModoRecibo(pedido);
};

/* =========================================================
   INIT
========================================================= */
if (window.ORDER_ID) {
  document.addEventListener("DOMContentLoaded", () => {
    cargarPedidoExistente(window.ORDER_ID);
  });
}
