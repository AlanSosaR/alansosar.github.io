/**
 * 🧾 recibo.core.js — FINAL DEFINITIVO ESTABLE
 * Proyecto: Café Cortero — Material 3 Expressive
 */

console.log("🧾 recibo.core.js — READY");

/* =========================================================
   HELPERS & CONTEXTO
========================================================= */
const $id = (id) => document.getElementById(id);

function resolveImgUrl(src) {
  if (!src) return '/imagenes/no-image.png';
  if (src.startsWith('http')) return src;
  return `https://eaipcuvvddyrqkbmjmvw.supabase.co/storage/v1/object/public/product-images/${src}`;
}

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

    const key = Object.keys(localStorage).find(k => k.includes("-auth-token"));
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
   CANCELACIÓN — CONFIRMACIÓN
========================================================= */
function mostrarConfirmacionCancelacion(pedido) {
  const bar = $id("snackbar");
  if (!bar) return;

  bar.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;width:100%;">
      <span class="snack-text">
        ¿Deseas cancelar el pedido <strong>#${pedido.order_number}</strong>?
      </span>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button id="snack-no"
          style="background:none;border:none;color:#fff;font-weight:600;">
          No
        </button>
        <button id="snack-si"
          style="background:#ff4436;border:none;color:#fff;
                 font-weight:600;padding:8px 16px;border-radius:8px;">
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

  /* 🔒 UPDATE REAL + CONFIRMACIÓN */
  const { data, error } = await sb
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", pedido.id)
    .select("id,status")
    .single();

  if (error || !data) {
    window.showSnack("No se pudo cancelar el pedido");
    return;
  }

  /* 🔔 NOTIFICACIÓN AL ADMIN */
  await sb.from("notifications").insert({
    user_id: null,
    title: "Pedido cancelado",
    message: `El cliente ${pedido.users?.name || "Cliente"} canceló el pedido #${pedido.order_number}`, // Corregido: 'body' -> 'message'
    type: "order_cancelled",
    metadata: {
      order_id: pedido.id,
      order_number: pedido.order_number,
      customer_name: pedido.users?.name || null
    }
  });

  /* ✅ UI ACTUALIZADA */
  pedido.status = "cancelled";
  window.aplicarProgresoPedido("cancelled");
  window.showSnack("Pedido cancelado correctamente");

  const btn = $id("btnCancelarPedido") || document.querySelector(".btn-cancelar");
  if (btn) btn.remove();
}

/* =========================================================
   UI — MODO RECIBO
========================================================= */
window.aplicarModoRecibo = (pedido) => {
  const btnBack = $id("btn-back");
  if (btnBack) {
    btnBack.onclick = () => {
      window.location.href = "/pages/profile/mis-pedidos.html";
    };
  }

  const pagoLabel = document.querySelector(".pago-select-label");
  if (pagoLabel) pagoLabel.classList.add("hidden");

  const btnCancelar =
    $id("btnCancelarPedido") || document.querySelector(".btn-cancelar");

  if (!btnCancelar) return;

  if (pedido.status !== "pending") {
    btnCancelar.remove();
    return;
  }

  btnCancelar.disabled = false;
  btnCancelar.removeAttribute("disabled");
  btnCancelar.style.pointerEvents = "auto";
  btnCancelar.classList.remove("hidden", "disabled");

  btnCancelar.onclick = (e) => {
    e.preventDefault();
    mostrarConfirmacionCancelacion(pedido);
  };
};

/* =========================================================
   ESTADO — PÍLDORA
========================================================= */
window.aplicarProgresoPedido = (status) => {
  const el = $id("estado-pildora-container");
  if (!el) return;

  const map = {
    pending: ["Pendiente", "payments", "status-pending"],
    payment_review: ["Revisando pago", "fact_check", "status-review"],
    processing: ["En preparación", "coffee", "status-processing"],
    shipped: ["En camino", "local_shipping", "status-shipped"],
    delivered: ["Entregado", "check_circle", "status-delivered"],
    cancelled: ["Cancelado", "cancel", "status-cancelled"],
  };

  const [label, icon, cls] = map[status] || map.pending;

  el.innerHTML = `
    <div class="status-pill ${cls}">
      <span class="material-symbols-outlined">${icon}</span>
      <span>${label}</span>
    </div>
  `;
};

/* =========================================================
   CARGA DE PEDIDO
========================================================= */
window.cargarPedidoExistente = async (orderId) => {
  if (!orderId) return;

  await window.esperarSupabase();
  const sb = window.supabaseClient;

  const { data: pedido, error } = await sb
    .from("orders")
    .select(`
      *,
      users(name,email,phone),
      addresses(state,city,street),
      order_items(quantity,price,products(name,category,presentation,grind_type,image_url)),
      payment_receipts(file_url)
    `)
    .eq("id", orderId)
    .single();

  if (error || !pedido) {
    window.showSnack("No se encontró el pedido");
    return;
  }

  /* CABECERA */
  $id("numeroPedido").textContent = pedido.order_number;
  const d = new Date(pedido.created_at);
  $id("fechaPedido").textContent = d.toLocaleDateString();
  $id("horaPedido").textContent = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  $id("totalPedido").textContent = pedido.total.toFixed(2);
  $id("notaCliente").textContent = pedido.order_notes || "Sin nota";

  /* CLIENTE */
  if (pedido.users) {
    $id("nombreCliente").textContent = pedido.users.name;
    $id("correoCliente").textContent = pedido.users.email;
    $id("telefonoCliente").textContent = pedido.users.phone;
  }

  if (pedido.addresses) {
    $id("zonaCliente").textContent =
      `${pedido.addresses.state}, ${pedido.addresses.city}`;
    $id("direccionCliente").textContent = pedido.addresses.street;
  }

  /* PRODUCTOS */
  $id("listaProductos").innerHTML = pedido.order_items.map((it, idx) => {
    const sub = it.quantity * it.price;
    const imgSrc = resolveImgUrl(it.products?.image_url);
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:8px 0;${idx < pedido.order_items.length - 1 ? 'border-bottom:1px solid rgba(55,123,76,0.3)' : ''}">
        <div style="display:flex;gap:8px;flex:1;min-width:0">
          <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
            <img src="${imgSrc}" alt="${it.products.name}" style="width:64px;height:auto;object-fit:contain;border-radius:8px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.10))" onerror="this.onerror=null;this.src='/imagenes/no-image.png'">
            <span style="font-family:'Poppins',sans-serif;font-size:0.7rem;color:#50453e;margin-top:4px;text-align:center;line-height:1.2">${[it.products?.category, it.products?.grind_type, it.products?.presentation?.replace('1lb','1 lb (454 g)')].filter(Boolean).join(' · ') || 'Café'}</span>
          </div>
          <div style="display:flex;flex-direction:column;justify-content:center;min-width:0">
            <span style="font-family:'Poppins',sans-serif;font-weight:700;font-size:0.95rem;color:#553722">${it.products.name}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;flex-shrink:0;justify-content:center">
          <span style="font-family:'Poppins',sans-serif;font-weight:700;font-size:0.95rem;color:#377b4c">L ${sub.toFixed(2)}</span>
          <span style="font-family:'Poppins',sans-serif;font-size:0.85rem;color:#50453e">Cant: ${it.quantity}</span>
        </div>
      </div>`;
  }).join("");

  /* ===============================
     COMPROBANTE — SOLO IMAGEN + INFO
     (RECIBO REAL)
  ================================ */

  // eliminar bloques de checkout
  ["pago-deposito", "pago-efectivo"].forEach(id => {
    $id(id)?.remove();
  });
  document.querySelector(".pago-select-label")?.remove();

  // normalizar recibos
  const receiptList = Array.isArray(pedido.payment_receipts)
    ? pedido.payment_receipts
    : [];

  // usar preview correcto
  const preview = $id("previewComprobanteRecibo");
  const img = $id("imgComprobanteRecibo");

  if (!preview || !img) {
    console.warn("⚠️ previewComprobanteRecibo no existe");
    return;
  }

  // forzar visibilidad
  preview.classList.remove("hidden");
  preview.style.display = "flex";

  img.style.display = "block";
  img.style.pointerEvents = "none";

  const isCash = pedido.payment_method === "cash_on_delivery";

  let src = "/imagenes/recibo_default.svg";
  let texto = "Comprobante pendiente de validación.";

  if (isCash) {
    src = "/imagenes/pago_en_mano.svg";
    // Tono relajado: solo informa la modalidad sin pedir nada a cambio
    texto = "Tu pedido está confirmado. **Pagarás al recibirlo**, así que no te preocupes por nada más hasta que lleguemos.";
  } else if (receiptList.length && receiptList[0].file_url) {
    src = receiptList[0].file_url;
    // Tono de acompañamiento: confirma que el proceso sigue su curso natural
    texto = "Ya tenemos tu comprobante. **Estamos revisando los detalles** para que tu pedido empiece a prepararse pronto.";
  }


  // asignar imagen
  img.src = src;
  img.alt = "Comprobante de pago";
  img.loading = "lazy";

  // texto
  let p = preview.querySelector(".preview-text");
  if (!p) {
    p = document.createElement("p");
    p.className = "preview-text";
    preview.appendChild(p);
  }
  p.textContent = texto;

  // fallback
  img.onerror = () => {
    img.src = "/imagenes/recibo_default.svg";
  };

  /* ===============================
     ESTADO VISUAL
  ================================ */
  let statusVisual = pedido.status;

  if (
    pedido.payment_method === "bank_transfer" &&
    pedido.status === "pending" &&
    receiptList.length
  ) {
    statusVisual = "payment_review";
  }

  window.aplicarProgresoPedido(statusVisual);
  window.aplicarModoRecibo(pedido);

}; // ✅ CIERRE CORRECTO DE cargarPedidoExistente

/* =========================================================
   AUTO INIT
========================================================= */
if (window.ORDER_ID) {
  document.addEventListener("DOMContentLoaded", () => {
    window.cargarPedidoExistente(window.ORDER_ID);
  });
}
