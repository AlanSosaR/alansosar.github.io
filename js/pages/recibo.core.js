
function numeroALetras(num) {
  const Unidades = (n) => {
    const u = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
    return u[n] || "";
  };

  const Decenas = (n) => {
    if (n < 10) return Unidades(n);
    if (n >= 10 && n <= 15) {
      return ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE"][n - 10];
    }
    if (n > 15 && n < 20) return "DIECI" + Unidades(n - 10);
    if (n === 20) return "VEINTE";
    if (n > 20 && n < 30) return "VEINTI" + Unidades(n - 20);

    const decenas = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u === 0 ? decenas[d] : decenas[d] + " Y " + Unidades(u);
  };

  const Centenas = (n) => {
    if (n < 100) return Decenas(n);
    if (n === 100) return "CIEN";
    const c = Math.floor(n / 100);
    const resto = n % 100;
    const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
    const strC = centenas[c];
    return resto > 0 ? strC + " " + Decenas(resto) : strC;
  };

  const Miles = (n) => {
    if (n < 1000) return Centenas(n);
    const m = Math.floor(n / 1000);
    const resto = n % 1000;
    const strM = m === 1 ? "MIL" : Centenas(m) + " MIL";
    return resto > 0 ? strM + " " + Centenas(resto) : strM;
  };

  const Millones = (n) => {
    if (n < 1000000) return Miles(n);
    const mill = Math.floor(n / 1000000);
    const resto = n % 1000000;
    const strMill = mill === 1 ? "UN MILLÓN" : Miles(mill) + " MILLONES";
    return resto > 0 ? strMill + " " + Miles(resto) : strMill;
  };

  const enteros = Math.floor(num || 0);
  const centavos = Math.round(((num || 0) - enteros) * 100);
  const strCentavos = centavos.toString().padStart(2, "0") + "/100";

  if (enteros === 0) return "CERO LEMPIRAS CON " + strCentavos;
  if (enteros === 1) return "UN LEMPIRA CON " + strCentavos;

  return Millones(enteros).trim() + " LEMPIRAS CON " + strCentavos;
}

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

  bar.innerHTML = `
    <div class="snackbar-action-content">
      <div class="snackbar-text-wrap">
        <span class="material-symbols-outlined snackbar-icon">info</span>
        <span class="snack-text">${msg}</span>
      </div>
    </div>
  `;
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
  if ($id("notaCliente")) $id("notaCliente").textContent = "";

  /* CLIENTE */
  const customerName = pedido.users?.name || "Consumidor final";
  const isVentaRapida = customerName.toLowerCase().includes("venta rápida") || customerName.toLowerCase().includes("venta rapida");

  if (isVentaRapida) {
    $id("nombreCliente").textContent = "Consumidor final";
    document.getElementById("f-customer-email-row")?.classList.add("hidden");
    document.getElementById("f-customer-phone-row")?.classList.add("hidden");
    $id("direccionCliente").textContent = "Venta en mostrador / POS";
  } else {
    $id("nombreCliente").textContent = customerName;
    const emailRow = document.getElementById("f-customer-email-row");
    if (emailRow && pedido.users?.email && !pedido.users.email.includes("@pos.cafecortero.com")) {
      emailRow.classList.remove("hidden");
      $id("correoCliente").textContent = pedido.users.email;
    } else if (emailRow) {
      emailRow.classList.add("hidden");
    }
    const phoneRow = document.getElementById("f-customer-phone-row");
    if (phoneRow && pedido.users?.phone) {
      phoneRow.classList.remove("hidden");
      $id("telefonoCliente").textContent = pedido.users.phone;
    } else if (phoneRow) {
      phoneRow.classList.add("hidden");
    }
    if (pedido.addresses) {
      $id("direccionCliente").textContent = `${pedido.addresses.street || ""}, ${pedido.addresses.city || ""}`.trim().replace(/^,/, "");
    } else {
      $id("direccionCliente").textContent = "Recogida local / Sin dirección";
    }
  }

  /* PRODUCTOS */
  let subtotal = 0;
  $id("listaProductos").innerHTML = (pedido.order_items || []).map((it) => {
    const lineTotal = it.quantity * it.price;
    subtotal += lineTotal;
    const imgSrc = resolveImgUrl(it.products?.image_url);
    const desc = [it.products?.category, it.products?.grind_type, it.products?.presentation?.replace('1lb','1 lb (454 g)')].filter(Boolean).join(' • ') || 'Café';
    return `
      <tr>
        <td class="left col-prod">
          <div class="prod-info-cell" style="display:flex;align-items:center;gap:12px;">
            <img src="${imgSrc}" alt="${it.products?.name}" style="width:60px;height:60px;object-fit:contain;flex-shrink:0;background:transparent;border:none;" onerror="this.onerror=null;this.src='/imagenes/no-image.png'">
            <div>
              <p class="item-name">${it.products?.name}</p>
              <p class="item-desc">${desc}</p>
            </div>
          </div>
        </td>
        <td class="col-qty"><span class="qty-prefix">Cant: </span>${it.quantity}</td>
        <td class="right col-price" style="font-weight:700;color:var(--espresso);">L ${Number(it.price).toFixed(2)}</td>
      </tr>`;
  }).join("");

  const totalDescuento = Number(pedido.discount || pedido.discount_amount || 0);
  const fDescuento = document.getElementById("f-descuento");
  if (fDescuento) {
    fDescuento.textContent = `-L ${totalDescuento.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const finalTotal = pedido.total || subtotal;
  $id("totalPedido").textContent = finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isPos = pedido.channel === "pos" || (pedido.notes && pedido.notes.toLowerCase().includes("pos")) || (pedido.delivery_address && pedido.delivery_address.toLowerCase().includes("pos"));
  const payTitle = document.getElementById("f-pay-title");
  const paySub = document.getElementById("f-pay-subtitle");
  const payIcon = document.getElementById("f-pay-icon");
  if (payTitle) payTitle.textContent = isPos ? "Pedido POS" : "Pedido Web";
  if (paySub) paySub.textContent = isPos ? "Venta en mostrador" : "Operación autorizada";
  if (payIcon) {
    payIcon.innerHTML = isPos
      ? '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">point_of_sale</span>'
      : '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">verified</span>';
  }

  const fGravado = document.getElementById("f-gravado");
  if (fGravado) fGravado.textContent = `L ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fIsv = document.getElementById("f-isv");
  if (fIsv) fIsv.textContent = `L ${(subtotal * 0.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fLetras = document.getElementById("f-letras");
  if (fLetras) fLetras.textContent = numeroALetras(finalTotal);

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
