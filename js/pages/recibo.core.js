
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
  const statusBlock = document.querySelector(".status-block");
  const lblCliente = document.querySelector("#seccionDatosCliente .lbl");
  const docTitle = document.querySelector(".document-info h2");
  const adminCache = window.getUserCache?.() || JSON.parse(localStorage.getItem("cortero_user") || "null");
  const cleanAdminFromOrder = customerName.replace(/\s*\(Venta\s+r[aá]pida\)/i, "").trim();
  const adminName = (cleanAdminFromOrder && cleanAdminFromOrder.toLowerCase() !== "consumidor final")
    ? cleanAdminFromOrder
    : (adminCache?.name || "Administrador");

  if (isVentaRapida) {
    if (docTitle) docTitle.textContent = "Venta";
    if (lblCliente) lblCliente.textContent = "PEDIDO POS";
    $id("nombreCliente").textContent = "VENTA EN MOSTRADOR";
    document.getElementById("f-customer-email-row")?.classList.add("hidden");
    document.getElementById("f-customer-phone-row")?.classList.add("hidden");
    $id("direccionCliente").textContent = `POR: ${adminName}`;
    if (statusBlock) statusBlock.style.display = "none";
  } else {
    if (docTitle) docTitle.textContent = "Pedido";
    if (lblCliente) lblCliente.textContent = "Cliente";
    if (statusBlock) statusBlock.style.display = "";
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
  const formattedFinal = finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  $id("totalPedido").textContent = formattedFinal;
  const btnTotalEl = document.getElementById("btnTotalPedido");
  if (btnTotalEl) btnTotalEl.textContent = `L ${formattedFinal}`;

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

  const preview = $id("previewComprobanteRecibo");
  const img = $id("imgComprobanteRecibo");

  if (preview && img) {
    const isCash = pedido.payment_method === "cash_on_delivery" || pedido.payment_method === "cash";
    const hasReceiptFile = receiptList.length > 0 && Boolean(receiptList[0].file_url);

    if (isCash || !hasReceiptFile) {
      preview.classList.add("hidden");
      preview.style.display = "none";
    } else {
      preview.classList.remove("hidden");
      preview.style.display = "flex";
      img.style.display = "block";
      img.style.pointerEvents = "none";
      img.src = receiptList[0].file_url;
      img.alt = "Comprobante de pago";
      img.loading = "lazy";

      let p = preview.querySelector(".preview-text");
      if (!p) {
        p = document.createElement("p");
        p.className = "preview-text";
        preview.appendChild(p);
      }
      p.textContent = "Comprobante de transferencia bancaria adjunto.";
      img.onerror = () => {
        preview.classList.add("hidden");
        preview.style.display = "none";
      };
    }
  }

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

  // Mostrar pantalla de confirmación/éxito si viene de enviar pedido o no viene del historial
  const params = new URLSearchParams(window.location.search);
  const isFromHistory = params.get("from") === "pedidos" || params.get("from") === "admin";
  if (!isFromHistory) {
    window.mostrarPantallaExitoCore(pedido);
  }

}; // ✅ CIERRE CORRECTO DE cargarPedidoExistente

/* =========================================================
   PANTALLA LIMPIA DE ÉXITO (MODO CORE / CONSULTA)
========================================================= */
window.mostrarPantallaExitoCore = function (pedido) {
  window.__ORDER_COMPLETED__ = true;
  document.body.classList.add("is-read-only");
  window.IS_READ_ONLY = true;

  // Reconfigurar la flecha de volver del header y del recibo para que lleven al index
  const backBtn = document.getElementById("header-recibo-back");
  if (backBtn) {
    backBtn.href = "/pages/home/index.html";
    backBtn.onclick = (e) => {
      e.preventDefault();
      window.location.href = "/pages/home/index.html";
    };
  }

  const btnBack = document.getElementById("btn-back");
  if (btnBack) {
    btnBack.onclick = (e) => {
      e.preventDefault();
      window.location.href = "/pages/home/index.html";
    };
  }

  window.history.pushState({ page: "recibo-success" }, "", window.location.href);
  window.onpopstate = function () {
    window.location.href = "/pages/home/index.html";
  };

  const customerName = pedido.users?.name || "Consumidor final";
  const storedChannel = sessionStorage.getItem("order_channel_" + pedido.id);
  const notes = String(pedido.order_notes || pedido.notes || "");
  const isVentaRapida = storedChannel === "venta_rapida" ||
                        notes.includes("VENTA_RAPIDA") ||
                        customerName.toLowerCase().includes("venta rápida") ||
                        customerName.toLowerCase().includes("venta rapida");
  const isPOS = isVentaRapida ||
                storedChannel === "pos" ||
                notes.includes("POS") ||
                pedido.channel === "pos" ||
                (pedido.delivery_address && pedido.delivery_address.toLowerCase().includes("pos"));

  // Actualizar título del header
  const headerTitle = document.getElementById("header-recibo-title-text");
  if (headerTitle) {
    headerTitle.textContent = isVentaRapida ? "Venta confirmada" : "Pedido confirmado";
  }

  // Ocultar toda la información previa de la factura
  const invoiceContainer = document.querySelector(".invoice-container");
  if (invoiceContainer) {
    invoiceContainer.classList.add("hidden");
  }

  // Eliminar barra superior si existía previamente
  document.getElementById("comprobanteTopBar")?.remove();

  // Textos según tipo de venta / pedido
  const titleText = isVentaRapida
    ? "Venta creada con éxito"
    : (isPOS ? "Venta creada con éxito" : "Pedido enviado con éxito");

  const subtitleHtml = isVentaRapida
    ? ""
    : `<p class="success-screen-desc">${isPOS ? `El pedido para ${customerName || "el cliente"} se registró correctamente.` : `Tu pedido #${pedido.order_number} ha sido recibido y estamos procesándolo.`}</p>`;

  const clientPillRow = isVentaRapida
    ? ""
    : `
      <div class="summary-pill-row">
        <span class="pill-label">Cliente</span>
        <span class="pill-value">${customerName || "Cliente"}</span>
      </div>
    `;

  const docPillRow = `
    <div class="summary-pill-row">
      <span class="pill-label">${isVentaRapida ? "Comprobante" : "Documento"}</span>
      <span class="pill-value">${isVentaRapida ? "Venta" : "Pedido"} Nº ${pedido.order_number}</span>
    </div>
  `;

  const orderUserId = pedido.user_id;
  const perfilUrl = isPOS
    ? `/pages/admin/admin-clientes.html?id=${orderUserId}`
    : "/pages/profile/mis-pedidos.html";

  const perfilTxt = isPOS ? "Ver en clientes" : "Ver en mi perfil";
  const nuevaTxt = isPOS ? "Crear nueva venta" : "Crear nuevo pedido";
  const formattedTotal = Number(pedido.total || 0).toFixed(2);
  const isCash = pedido.payment_method === "cash" || pedido.payment_method === "cash_on_delivery";
  const metodoNombre = isCash ? "Pago en efectivo" : "Transferencia bancaria";

  // Insertar y mostrar SOLO la nueva pantalla limpia de éxito en la misma vista
  const reciboContainer = document.querySelector(".recibo-container");
  let pantallaExito = document.getElementById("pantallaExito");
  if (!pantallaExito && reciboContainer) {
    pantallaExito = document.createElement("section");
    pantallaExito.id = "pantallaExito";
    pantallaExito.className = "success-screen-card fade-in";
    reciboContainer.appendChild(pantallaExito);
  }

  if (pantallaExito) {
    pantallaExito.classList.remove("hidden");
    pantallaExito.innerHTML = `
      <div class="success-screen-icon-wrap">
        <span class="material-symbols-outlined success-screen-icon">check_circle</span>
      </div>

      <h2 class="success-screen-title">${titleText}</h2>
      ${subtitleHtml}

      <div class="success-screen-summary">
        ${clientPillRow}
        ${docPillRow}
        <div class="summary-pill-row">
          <span class="pill-label">Total cobrado</span>
          <span class="pill-value highlight">L ${formattedTotal}</span>
        </div>
        <div class="summary-pill-row">
          <span class="pill-label">Método de pago</span>
          <span class="pill-value">${metodoNombre}</span>
        </div>
      </div>

      <div class="success-screen-actions">
        <button type="button" class="btn-action-primary" id="btnNuevaVenta">
          <span class="material-symbols-outlined">add_circle</span>
          <span>${nuevaTxt}</span>
        </button>

        <a href="${perfilUrl}" class="btn-action-secondary" id="btnVerPerfil">
          <span class="material-symbols-outlined">receipt_long</span>
          <span>${perfilTxt}</span>
        </a>

        <button type="button" class="btn-ver-factura-link" id="btnToggleFactura">
          <span class="material-symbols-outlined">visibility</span>
          <span>Ver comprobante completo</span>
        </button>
      </div>
    `;

    document.getElementById("btnNuevaVenta")?.addEventListener("click", () => {
      window.location.href = "/pages/home/index.html";
    });

    document.getElementById("btnToggleFactura")?.addEventListener("click", () => {
      if (invoiceContainer && pantallaExito) {
        pantallaExito.classList.add("hidden");
        invoiceContainer.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  // Botones inferiores dentro de invoiceContainer
  const botonesContainer = document.querySelector(".recibo-botones");
  if (botonesContainer) {
    botonesContainer.innerHTML = `
      <button type="button" class="btn-action-primary" id="btnNuevaVentaBottom">
        <span class="material-symbols-outlined">add_circle</span>
        <span>${nuevaTxt}</span>
      </button>
      <button type="button" class="btn-action-secondary" id="btnVolverPantallaExitoBottom">
        <span class="material-symbols-outlined">arrow_back</span>
        <span>Volver a la confirmación</span>
      </button>
      <button type="button" class="btn-imprimir-recibo" id="btnImprimirFacturaBottom">
        <span class="material-symbols-outlined">print</span>
        <span>Imprimir</span>
      </button>
    `;

    document.getElementById("btnNuevaVentaBottom")?.addEventListener("click", () => {
      window.location.href = "/pages/home/index.html";
    });

    document.getElementById("btnVolverPantallaExitoBottom")?.addEventListener("click", () => {
      invoiceContainer.classList.add("hidden");
      if (pantallaExito) {
        pantallaExito.classList.remove("hidden");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.getElementById("btnImprimirFacturaBottom")?.addEventListener("click", () => {
      window.print();
    });
  }
};

/* =========================================================
   AUTO INIT
========================================================= */
if (window.ORDER_ID) {
  document.addEventListener("DOMContentLoaded", () => {
    window.cargarPedidoExistente(window.ORDER_ID);
  });
}
