
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
 * 🧾 recibo.checkout.js — FINAL MATERIAL 3 EXPRESSIVE (SNACKBAR REAL FIXED)
 */

console.log("🧾 recibo.checkout.js — INIT");

/* =========================================================
   GUARD
========================================================= */
if (window.IS_READ_ONLY) {
  throw new Error("Checkout bloqueado");
}

/* =========================================================
    HELPERS
========================================================= */
const $ = (id) => document.getElementById(id);

function resolveImgUrl(src) {
  if (!src) return '/imagenes/no-image.png';
  if (src.startsWith('http')) return src;
  return `https://eaipcuvvddyrqkbmjmvw.supabase.co/storage/v1/object/public/product-images/${src}`;
}

/* =========================================================
   UI (referencias seguras)
========================================================= */
const metodoPago = $("metodoPago");
const bloqueDeposito = $("pago-deposito");
const bloqueEfectivo = $("pago-efectivo");
const loader = $("loaderAccion");

const inputFile = $("inputComprobante");
const previewBox = $("previewComprobante");
const imgPreview = $("imgComprobante");
const btnSubir = $("btnSubirComprobante");

/* =========================================================
   STATE
========================================================= */
let btnEnviar = null;
let selectedAddressId = null;
let totalPedido = 0;
let tempFile = null;
let isFirstOrder = false;

// ✅ FIX: cache estable de la nota del pedido
let orderNotesCache = null;

const CART_KEY = "cafecortero_cart";
const carrito = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

/* =========================================================
   HELPERS POS Y USUARIO
========================================================= */
async function asegurarUsuarioPOS(sb, posClient) {
  if (!posClient) return null;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(posClient.id || "");
  if (isUUID) {
    return posClient.id;
  }

  // Si no es un UUID válido (ej: "pos_rapida" o local), crear/asegurar en Supabase
  try {
    const { data: created, error } = await sb.rpc("create_pos_client", {
      p_name: posClient.name || "Consumidor Final",
      p_phone: posClient.phone || null,
      p_email: posClient.email || null
    });

    if (!error && created && created.id) {
      posClient.id = created.id;
      if (window.POS_CLIENT) window.POS_CLIENT.id = created.id;
      try { sessionStorage.setItem("pos_client", JSON.stringify(posClient)); } catch (_) {}
      return created.id;
    }
  } catch (e) {
    console.warn("Aviso asegurando usuario POS:", e);
  }

  // Fallback: usar id del admin logueado si existe
  const admin = JSON.parse(localStorage.getItem("cortero_user") || "null");
  if (admin && admin.id) return admin.id;

  return posClient.id;
}

/* =========================================================
   PROVISIONAL (SOLO UI)
========================================================= */
async function pintarDatosProvisionales() {
  const sb = window.supabaseClient;
  const user = window.supabaseAuth.getCurrentUser();
  if (!sb) return;

  const isPOS = !!window.POS_CLIENT;
  let uid = isPOS ? window.POS_CLIENT.id : user?.id;
  if (!uid) return;

  if (isPOS && window.POS_CLIENT) {
    uid = await asegurarUsuarioPOS(sb, window.POS_CLIENT);
  }

  let next = 1;
  try {
    // 1. Consultar directamente el número máximo real en orders para evitar saltos por intentos fallidos
    const { data: lastOrder, error: orderErr } = await sb
      .from("orders")
      .select("order_number")
      .eq("user_id", uid)
      .order("order_number", { ascending: false })
      .limit(1);

    if (!orderErr && lastOrder && lastOrder.length > 0 && lastOrder[0].order_number != null) {
      next = Number(lastOrder[0].order_number) + 1;
    } else {
      // 2. Fallback a preview_next_order_number
      const { data: previewNum, error: prevErr } = await sb.rpc("preview_next_order_number", { p_user_id: uid });
      if (!prevErr && previewNum) {
        next = previewNum;
      } else {
        next = 1;
      }
    }
  } catch (_) {
    next = 1;
  }

  const now = new Date();

  $("numeroPedido").textContent = String(next);
  $("fechaPedido").textContent = now.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  $("horaPedido").textContent = now.toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* =========================================================
   PREVIEW COMPROBANTE
========================================================= */
function mostrarPreview(file) {
  tempFile = file;
  imgPreview.src = URL.createObjectURL(file);
  previewBox.classList.remove("hidden");
  if (btnSubir) {
    btnSubir.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Cambiar comprobante';
    btnSubir.classList.add("comprobante-cargado");
  }
  validarBoton();
}

/* =========================================================
   VALIDACIÓN CENTRAL DEL BOTÓN
========================================================= */
function validarBoton() {
  if (!btnEnviar) return;

  // Si el carrito está vacío, no permitir envío
  if (!carrito || carrito.length === 0) {
    btnEnviar.disabled = true;
    return;
  }

  if (metodoPago.value === "cash") {
    btnEnviar.disabled = false;
    return;
  }

  if (metodoPago.value === "bank_transfer") {
    btnEnviar.disabled = !tempFile && !window.POS_CLIENT;
    return;
  }

  btnEnviar.disabled = true;
}

/* =========================================================
   DATOS CLIENTE
========================================================= */
async function cargarResumen() {
  const sb = window.supabaseClient;
  const user = window.supabaseAuth.getCurrentUser();
  if (!sb || !user) return;

  if (window.POS_CLIENT) {
    const payTitle = document.getElementById("f-pay-title");
    const paySub = document.getElementById("f-pay-subtitle");
    const payIcon = document.getElementById("f-pay-icon");
    if (payTitle) payTitle.textContent = "Pedido POS";
    if (paySub) paySub.textContent = "Venta en mostrador";
    if (payIcon) payIcon.innerHTML = '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">point_of_sale</span>';

    const isVentaRapida = String(window.POS_CLIENT.name || "").toLowerCase().includes("venta rápida") ||
                          String(window.POS_CLIENT.name || "").toLowerCase().includes("venta rapida");
    const statusBlock = document.querySelector(".status-block");
    const lblCliente = document.querySelector("#seccionDatosCliente .lbl");
    const docTitle = document.querySelector(".document-info h2");
    const btnTextEl = document.getElementById("btnText");
    const adminCache = JSON.parse(localStorage.getItem("cortero_user") || "null");
    const fallbackAdmin = String(window.POS_CLIENT.name || "").replace(/\s*\(Venta\s+r[aá]pida\)/i, "").trim();
    const adminName = adminCache?.name || user?.name || fallbackAdmin || "Administrador";

    if (isVentaRapida) {
      if (docTitle) docTitle.textContent = "Venta";
      if (btnTextEl && !window.IS_READ_ONLY) btnTextEl.textContent = "Confirmar venta";
      if (lblCliente) lblCliente.textContent = "PEDIDO POS";
      $("nombreCliente").textContent = "VENTA EN MOSTRADOR";
      document.getElementById("f-customer-email-row")?.classList.add("hidden");
      document.getElementById("f-customer-phone-row")?.classList.add("hidden");
      $("direccionCliente").textContent = `POR: ${adminName}`;
      if ($("notaCliente")) $("notaCliente").textContent = "";
      if (statusBlock) statusBlock.style.display = "none";
    } else {
      if (docTitle) docTitle.textContent = "Pedido";
      if (btnTextEl && !window.IS_READ_ONLY) btnTextEl.textContent = "Confirmar pedido";
      if (lblCliente) lblCliente.textContent = "Cliente";
      if (statusBlock) statusBlock.style.display = "";
      $("nombreCliente").textContent = window.POS_CLIENT.name;
      const rawPosMail = window.POS_CLIENT.email || "";
      const isDummyMail = !rawPosMail || rawPosMail.includes("@pos.cafecortero.com") || rawPosMail.startsWith("pos_");
      const emailRow = document.getElementById("f-customer-email-row");
      if (emailRow) {
        if (isDummyMail) {
          emailRow.classList.add("hidden");
        } else {
          emailRow.classList.remove("hidden");
          $("correoCliente").textContent = rawPosMail;
        }
      }
      const phoneRow = document.getElementById("f-customer-phone-row");
      if (phoneRow) {
        if (window.POS_CLIENT.phone) {
          phoneRow.classList.remove("hidden");
          $("telefonoCliente").textContent = window.POS_CLIENT.phone;
        } else {
          phoneRow.classList.add("hidden");
        }
      }
      $("direccionCliente").textContent = "Recogida local / Sin dirección";
      if ($("notaCliente")) $("notaCliente").textContent = "";
    }
    return;
  }

  const { data: userRow } = await sb
    .from("users")
    .select("name,email,phone")
    .eq("id", user.id)
    .single();

  if (userRow) {
    $("nombreCliente").textContent = userRow.name;
    $("correoCliente").textContent = userRow.email;
    $("telefonoCliente").textContent = userRow.phone;
  }

  const { data: addr } = await sb
    .from("addresses")
    .select("id,state,city,street")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (addr?.length) {
    selectedAddressId = addr[0].id;
    $("zonaCliente").textContent = `${addr[0].state}, ${addr[0].city}`;
    $("direccionCliente").textContent = addr[0].street;
  }

  if ($("notaCliente")) $("notaCliente").textContent = "";
}

/* =========================================================
   CARRITO
========================================================= */
function renderCarrito() {
  const lista = $("listaProductos");
  lista.innerHTML = "";
  totalPedido = 0;

  carrito.forEach((it) => {
    const lineTotal = it.qty * it.price;
    totalPedido += lineTotal;
    const imgSrc = resolveImgUrl(it.img);
    const desc = [it.category, it.grind, it.presentation?.replace('1lb','1 lb (454 g)'), it.weight ? it.weight + 'g' : ''].filter(Boolean).join(' • ') || 'Café';
    lista.innerHTML += `
      <tr>
        <td class="left col-prod">
          <div class="prod-info-cell" style="display:flex;align-items:center;gap:12px;">
            <img src="${imgSrc}" alt="${it.name}" style="width:60px;height:60px;object-fit:contain;flex-shrink:0;background:transparent;border:none;" onerror="this.onerror=null;this.src='/imagenes/no-image.png'">
            <div>
              <p class="item-name">${it.name}</p>
              <p class="item-desc">${desc}</p>
            </div>
          </div>
        </td>
        <td class="col-qty"><span class="qty-prefix">Cant: </span>${it.qty}</td>
        <td class="right col-price" style="font-weight:700;color:var(--espresso);">L ${Number(it.price).toFixed(2)}</td>
      </tr>`;
  });

  let totalDescuento = 0;
  carrito.forEach(it => {
    const qty = Number(it.qty || 1);
    const price = Number(it.price || 0);
    const origPrice = Number(it.price_original || it.original_price || 0);
    if (origPrice > price) {
      totalDescuento += (origPrice - price) * qty;
    } else if (it.discount_percent > 0) {
      totalDescuento += (price * (it.discount_percent / 100)) * qty;
    } else if (it.discount_amount) {
      totalDescuento += Number(it.discount_amount);
    }
  });

  const fDescuento = document.getElementById("f-descuento");
  if (fDescuento) {
    fDescuento.textContent = `-L ${totalDescuento.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const formattedTotal = totalPedido.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  $("totalPedido").textContent = formattedTotal;
  const btnTotalEl = document.getElementById("btnTotalPedido");
  if (btnTotalEl) btnTotalEl.textContent = `L ${formattedTotal}`;

  const fGravado = document.getElementById("f-gravado");
  if (fGravado) fGravado.textContent = `L ${formattedTotal}`;

  const fIsv = document.getElementById("f-isv");
  if (fIsv) fIsv.textContent = `L ${(totalPedido * 0.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fLetras = document.getElementById("f-letras");
  if (fLetras) fLetras.textContent = numeroALetras(totalPedido);

  // Mensaje de primer descuento
  if (isFirstOrder) {
    const noteContainer = document.querySelector(".items-area");
    if (noteContainer && !document.getElementById("first-order-badge-el")) {
      const b = document.createElement("div");
      b.id = "first-order-badge-el";
      b.style.cssText = "margin-top: 14px; padding: 12px; background: rgba(55, 123, 76, 0.08); border: 1px dashed var(--primary); border-radius: 8px; color: var(--primary); font-size: 0.85rem; display: flex; align-items: center; gap: 8px;";
      b.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2rem;">auto_awesome</span><span>¡Felicidades! Al ser tu <b>primera vez</b>, tienes descuentos especiales aplicados.</span>';
      noteContainer.appendChild(b);
    }
  }
}

/* =========================================================
   MÉTODO DE PAGO
========================================================= */
window.actualizarPago = function actualizarPago() {
  const v = metodoPago.value;

  bloqueDeposito.classList.toggle("hidden", v !== "bank_transfer");
  bloqueEfectivo.classList.toggle("hidden", v !== "cash");

  validarBoton();
}
/* =========================================================
   SNACKBAR DE CONFIRMACIÓN (ACCIÓN)
========================================================= */
function mostrarConfirmacionEnvio() {
  const bar = $("snackbar");
  if (!bar) return;

  const isVentaRapida = window.POS_CLIENT && (
    String(window.POS_CLIENT.name || "").toLowerCase().includes("venta rápida") ||
    String(window.POS_CLIENT.name || "").toLowerCase().includes("venta rapida")
  );
  const snackMsg = isVentaRapida
    ? "¿Confirmar venta?"
    : (window.POS_CLIENT ? "¿Confirmar compra?" : "¿Confirmar envío del pedido?");

  bar.innerHTML = `
    <div class="snackbar-action-content">
      <div class="snackbar-text-wrap">
        <span class="material-symbols-outlined snackbar-icon">help_outline</span>
        <span class="snack-text">${snackMsg}</span>
      </div>
      <div class="snackbar-actions">
        <button id="snack-editar" type="button" class="btn-snack-secondary">
          Editar
        </button>
        <button id="snack-confirmar" type="button" class="btn-snack-primary">
          <span class="material-symbols-outlined" style="font-size: 18px;">check</span>
          <span>Confirmar</span>
        </button>
      </div>
    </div>
  `;

  bar.classList.add("show");

  $("snack-editar").onclick = () => bar.classList.remove("show");
  $("snack-confirmar").onclick = () => {
    bar.classList.remove("show");
    enviarPedido();
  };
}

/* =========================================================
   CLICK EN ENVIAR
========================================================= */
function confirmarEnvio(e) {
  if (e && e.preventDefault) e.preventDefault(); // 🛡️ Evitar recarga

  if (!btnEnviar || btnEnviar.disabled) return;

  if (!carrito || carrito.length === 0) {
    window.showSnack("Tu carrito está vacío. Agrega productos antes de pedir.");
    return;
  }

  const user = window.supabaseAuth?.getCurrentUser?.();
  if (!window.POS_CLIENT && !user) {
    window.showSnack("Debes iniciar sesión con tu cuenta para confirmar tu pedido.");
    setTimeout(() => {
      window.location.href = "/pages/auth/login.html?redirect=recibo";
    }, 1800);
    return;
  }

  if (!window.POS_CLIENT && !selectedAddressId) {
    window.showSnack("Falta la dirección de entrega. Completa tus datos de envío.");
    setTimeout(() => {
      window.location.href = "/pages/profile/datos_cliente.html?from=recibo";
    }, 1800);
    return;
  }

  if (!metodoPago.value) {
    window.showSnack("Selecciona un método de pago");
    return;
  }

  if (metodoPago.value === "bank_transfer" && !tempFile && !window.POS_CLIENT) {
    window.showSnack("Debes subir el comprobante de pago");
    return;
  }

  mostrarConfirmacionEnvio();
}

/* =========================================================
   ENVÍO FINAL
========================================================= */
async function enviarPedido() {
  const sb = window.supabaseClient;
  const user = window.supabaseAuth.getCurrentUser();

  const isPOS = !!window.POS_CLIENT;
  const isVentaRapida = isPOS && (
    String(window.POS_CLIENT.name || "").toLowerCase().includes("venta rápida") ||
    String(window.POS_CLIENT.name || "").toLowerCase().includes("venta rapida")
  );
  let orderUserId = isPOS ? window.POS_CLIENT.id : user?.id;
  const customerName = isPOS ? window.POS_CLIENT.name : user?.name;

  if (isPOS && window.POS_CLIENT) {
    orderUserId = await asegurarUsuarioPOS(sb, window.POS_CLIENT);
  }

  if (!orderUserId) {
    window.showSnack("Inicia sesión o selecciona un cliente para completar el pedido.");
    return;
  }

  if (!isPOS && !selectedAddressId) {
    window.showSnack("Falta la dirección de envío.");
    setTimeout(() => { window.location.href = "/pages/profile/datos_cliente.html?from=recibo"; }, 1500);
    return;
  }

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  try {
    let orderNumber;
    try {
      // 1. Consultar el número máximo real en orders en la base de datos
      const { data: lastOrder, error: orderErr } = await sb
        .from("orders")
        .select("order_number")
        .eq("user_id", orderUserId)
        .order("order_number", { ascending: false })
        .limit(1);

      if (!orderErr && lastOrder && lastOrder.length > 0 && lastOrder[0].order_number != null) {
        orderNumber = Number(lastOrder[0].order_number) + 1;
      } else {
        const { data: num, error: numErr } = await sb.rpc("next_order_number", { p_user_id: orderUserId });
        if (!numErr && num) {
          orderNumber = num;
        } else {
          orderNumber = 1;
        }
      }
    } catch (_) {
      orderNumber = 1;
    }

    $("numeroPedido").textContent = String(orderNumber);

    const orderNotes = orderNotesCache;
    const method = metodoPago.value;
    const paymentMethod = method === "bank_transfer" ? "bank_transfer" : "cash_on_delivery";

    const { data: order, error } = await sb
      .from("orders")
      .insert({
        user_id: orderUserId,
        address_id: isPOS ? null : selectedAddressId,
        order_number: orderNumber,
        total: totalPedido,
        payment_method: paymentMethod,
        status: isPOS ? "delivered" : "pending",
        order_notes: isVentaRapida ? (orderNotes ? `${orderNotes} [VENTA_RAPIDA]` : "[VENTA_RAPIDA]") : (isPOS ? (orderNotes ? `${orderNotes} [POS]` : "[POS]") : orderNotes)
      })
      .select("id")
      .single();

    if (order?.id) {
      sessionStorage.setItem("order_channel_" + order.id, isVentaRapida ? "venta_rapida" : (isPOS ? "pos" : "web"));
      sessionStorage.setItem("last_completed_order", order.id);
    }

    if (error || !order) {
      console.error("❌ Error en orders.insert:", error);
      let msg = error?.message || "No se pudo crear el pedido";
      if (msg.includes("row-level security")) {
        msg = isPOS 
          ? "Permisos insuficientes: Inicia sesión como Administrador para registrar ventas POS."
          : "Sesión requerida: Inicia sesión con tu cuenta para enviar el pedido.";
      }
      throw new Error(msg);
    }

    console.log("Pedido creado:", order.id, isPOS ? "(POS)" : "");

    const { error: itemsError } = await sb.from("order_items").insert(
      carrito.map(it => ({
        order_id: order.id,
        product_id: it.product_id || it.id,
        quantity: it.qty,
        price: it.price
      }))
    );

    if (itemsError) {
      console.error("❌ Error en order_items.insert:", itemsError);
      throw new Error("Error al guardar productos: " + (itemsError.message || ""));
    }

    if (isPOS) {
      for (const it of carrito) {
        const prodId = it.product_id || it.id;
        if (prodId) {
          const { data: prod } = await sb.from("products").select("stock").eq("id", prodId).single();
          if (prod) {
            await sb.from("products").update({ stock: Math.max(0, prod.stock - it.qty) }).eq("id", prodId);
          }
        }
      }
      const now = new Date();
      const adminUser = JSON.parse(localStorage.getItem("cortero_user") || "null");
      const fmFecha = now.toISOString().split("T")[0];
      const fmHora = now.toTimeString().slice(0, 8);
      const fmMetodo = metodoPago.value === "cash" ? "Efectivo" : "Transferencia";
      for (const it of carrito) {
        await sb.from("finanzas_movimientos").insert({
          tipo: "ingreso",
          categoria: "Pedido POS",
          concepto: it.name,
          monto: it.qty * it.price,
          fecha: fmFecha,
          hora: fmHora,
          metodo_pago: fmMetodo,
          created_by: adminUser?.id || null,
          product_id: it.product_id || it.id,
          order_id: order.id,
        });
      }
    }

    if (tempFile) {
      const ext = tempFile.name.split(".").pop();
      const path = `${orderUserId}/${order.id}.${ext}`;

      await sb.storage
        .from("payment-receipts")
        .upload(path, tempFile, { upsert: true });

      const { data } = sb.storage
        .from("payment-receipts")
        .getPublicUrl(path);

      await sb.from("payment_receipts").insert({
        order_id: order.id,
        user_id: orderUserId,
        file_url: data.publicUrl,
        file_path: path
      });
    }

    try {
      await sb.from("notifications").insert({
        user_id: null,
        title: isPOS ? "Pedido POS registrado" : "Nuevo pedido recibido",
        message: isPOS
          ? `Pedido #${orderNumber} registrado en mostrador para ${customerName || 'Cliente'}`
          : `El cliente ${customerName || 'Cliente'} ha realizado el pedido #${orderNumber}.`,
        type: "new_order",
        is_read: false,
        metadata: {
          order_id: order.id,
          order_number: orderNumber
        }
      });
    } catch (notifErr) {
      console.warn("Aviso al crear notificación:", notifErr);
    }

    if (!isPOS) {
      try {
        const waApi = "https://cafe-cortero.vercel.app/api/wa-proxy";
        const waKey = "429683C4C977415CAAFCCE10F7D57E11";
        const groupJid = "120363410476492208@g.us";
        const maxLen = Math.max(...carrito.map(it => it.name.length), 12);
        const prodLines = carrito.map((it, i) => {
          const name = it.name.padEnd(maxLen);
          return ` ${i + 1}.  ${name}  ×${String(it.qty).padStart(2)}   L ${it.price.toFixed(2)}`;
        }).join("\n");
        const sep = "━".repeat(Math.max(maxLen + 18, 30));
        const customerPhone = ($("telefonoCliente")?.textContent || "").trim();
        const addressLine = [$("direccionCliente")?.textContent, $("zonaCliente")?.textContent].filter(Boolean).join(", ");

        const msg = `☕ *Nuevo Pedido #${orderNumber}*\n\n👤 *Cliente:* ${customerName || 'Cliente'}\n📞 *Tel:* ${customerPhone || "N/D"}\n📍 *Dirección:* ${addressLine || "N/D"}\n\n━━━ *Productos* ━━━\n\n${prodLines}\n${sep}\n💰 *Total:* L ${totalPedido.toFixed(2)}\n💳 *Pago:* ${paymentMethod === "bank_transfer" ? "Transferencia bancaria" : "Efectivo contra entrega"}`;

        await fetch(`${waApi}/message/sendText/CafeCortero`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: waKey },
          body: JSON.stringify({ number: groupJid, text: msg })
        });

        const cur = parseInt(localStorage.getItem("wa_notif_count") || "0", 10);
        localStorage.setItem("wa_notif_count", String(cur + 1));
      } catch (e) {
        console.error("Error al enviar WhatsApp al grupo:", e);
      }
    }

    localStorage.setItem(CART_KEY, "[]");
    sessionStorage.removeItem("current_order_notes");
    sessionStorage.removeItem("pos_client");
    window.dispatchEvent(new Event("cartUpdated"));

    mostrarExito({
      order,
      orderNumber,
      isPOS,
      isVentaRapida,
      orderUserId,
      customerName
    });

  } catch (e) {
    console.error("❌ Error en enviarPedido:", e);
    const msg = e?.message || "Error al enviar el pedido";
    window.showSnack(msg, 6000);
    btnEnviar.disabled = false;
  } finally {
    loader.classList.add("hidden");
  }
}

/* =========================================================
   PANTALLA DE ÉXITO POST-CONFIRMACIÓN
========================================================= */
function mostrarExito({ order, orderNumber, isPOS, isVentaRapida, orderUserId, customerName }) {
  window.__ORDER_COMPLETED__ = true;
  document.body.classList.add("is-read-only");
  window.IS_READ_ONLY = true;

  // Actualizar la URL sin recargar para fijar el ID del pedido y evitar que al recargar se trate como checkout
  window.history.replaceState({ page: "recibo-success" }, "", `/pages/shop/recibo.html?id=${order.id}`);

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

  // Atrapamos el gesto o botón atrás del navegador para que redirija al index y no a checkout
  window.history.pushState({ page: "recibo-success" }, "", window.location.href);
  window.onpopstate = function () {
    window.location.href = "/pages/home/index.html";
  };

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

  // Textos según tipo de venta / pedido
  const titleText = isVentaRapida
    ? "Venta creada con éxito"
    : (isPOS ? "Venta creada con éxito" : "Pedido enviado con éxito");

  const subtitleHtml = isVentaRapida
    ? ""
    : `<p class="success-screen-desc">${isPOS ? `El pedido para ${customerName || "el cliente"} se registró correctamente.` : `Tu pedido #${orderNumber} ha sido recibido y estamos procesándolo.`}</p>`;

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
      <span class="pill-value">${isVentaRapida ? "Venta" : "Pedido"} Nº ${orderNumber}</span>
    </div>
  `;

  const perfilUrl = isPOS
    ? `/pages/admin/admin-clientes.html?id=${orderUserId}`
    : "/pages/profile/mis-pedidos.html";

  const perfilTxt = isPOS ? "Ver en clientes" : "Ver en mi perfil";
  const nuevaTxt = isPOS ? "Crear nueva venta" : "Crear nuevo pedido";
  const formattedTotal = Number(totalPedido || 0).toFixed(2);
  const metodoNombre = metodoPago.value === "cash" ? "Pago en efectivo" : "Transferencia bancaria";

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

  // Eliminar barra superior si existía previamente
  document.getElementById("comprobanteTopBar")?.remove();

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

  window.scrollTo({ top: 0, behavior: "smooth" });
  window.showSnack(titleText);
}

/* =========================================================
   INIT
========================================================= */
(async function init() {
  await window.esperarSupabase();

  // ✅ FIX: capturar la nota UNA VEZ al iniciar
  orderNotesCache =
    sessionStorage.getItem("current_order_notes")?.trim() || null;

  console.log("📝 Nota del pedido:", orderNotesCache);

  document.querySelector(".pedido-progreso")?.classList.add("hidden");

  btnEnviar = $("btnEnviar");
  if (!btnEnviar) {
    console.warn("⚠️ btnEnviar no existe todavía");
    return;
  }

  btnEnviar.disabled = true;
  btnEnviar.onclick = confirmarEnvio;

  await pintarDatosProvisionales();

  const sb = window.supabaseClient;
  const user = window.supabaseAuth.getCurrentUser();
  if (!window.POS_CLIENT && sb && user) {
    const { count } = await sb
      .from("orders")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id);
    isFirstOrder = (count === 0);
  }

  await cargarResumen();
  renderCarrito();

  if (window.POS_CLIENT) {
    metodoPago.value = "cash";
  }
  validarBoton();

  metodoPago.onchange = actualizarPago;
  btnSubir.onclick = () => inputFile.click();

  inputFile.onchange = () => {
    const f = inputFile.files[0];
    if (f && f.type.startsWith("image/")) mostrarPreview(f);
  };

  /* 🔙 BOTÓN ATRÁS (Checkout) */
  const btnBack = $("btn-back");
  if (btnBack) {
    btnBack.onclick = () => {
      window.location.href = "/pages/profile/datos_cliente.html?from=recibo";
    };
  }
})();
