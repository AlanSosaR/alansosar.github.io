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
   PROVISIONAL (SOLO UI)
========================================================= */
async function pintarDatosProvisionales() {
  const sb = window.supabaseClient;
  const user = window.supabaseAuth.getCurrentUser();
  if (!sb || !user) return;

  const { data } = await sb
    .from("orders")
    .select("order_number")
    .eq("user_id", user.id)
    .order("order_number", { ascending: false })
    .limit(1);

  const next = (data?.[0]?.order_number || 0) + 1;
  const now = new Date();

  $("numeroPedido").textContent = String(next).padStart(3, "0");
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
  validarBoton();
}

/* =========================================================
   VALIDACIÓN CENTRAL DEL BOTÓN
========================================================= */
function validarBoton() {
  if (!btnEnviar) return;

  if (metodoPago.value === "cash") {
    btnEnviar.disabled = false;
    return;
  }

  if (metodoPago.value === "bank_transfer") {
    btnEnviar.disabled = !tempFile;
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

  $("notaCliente").textContent =
    orderNotesCache || "Sin nota adicional";
}

/* =========================================================
   CARRITO
========================================================= */
function renderCarrito() {
  const lista = $("listaProductos");
  lista.innerHTML = "";
  totalPedido = 0;

  carrito.forEach(it => {
    const sub = it.qty * it.price;
    totalPedido += sub;
    lista.innerHTML += `
      <div class="cafe-item">
        <span>${it.name} × ${it.qty}</span>
        <strong>L ${sub.toFixed(2)}</strong>
      </div>`;
  });

  $("totalPedido").textContent = totalPedido.toFixed(2);

  // Mensaje de primer descuento
  const noteContainer = $("listaProductos");
  if (isFirstOrder) {
    const hasDiscountedItems = carrito.some(it => {
      // Podríamos comparar it.price con un precio base, pero simplifiquemos:
      // El usuario pidió que dijéramos esto en el primer pedido.
      return true;
    });

    if (hasDiscountedItems) {
      noteContainer.innerHTML += `
            <div class="first-order-badge" style="
                margin-top: 15px;
                padding: 12px;
                background: rgba(55, 123, 76, 0.1);
                border: 1px dashed var(--verde);
                border-radius: 12px;
                color: var(--verde);
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <span class="material-symbols-outlined" style="font-size: 1.2rem;">auto_awesome</span>
                <span>¡Felicidades! Al ser tu <b>primera vez</b>, hemos aplicado descuentos especiales en tus productos.</span>
            </div>
        `;
    }
  }
}

/* =========================================================
   MÉTODO DE PAGO
========================================================= */
function actualizarPago() {
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

  bar.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;width:100%;">
      <span class="snack-text">¿Confirmar envío del pedido?</span>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button id="snack-editar"
          style="background:none;border:none;color:#fff;font-weight:600;cursor:pointer;">
          Editar
        </button>
        <button id="snack-confirmar"
          style="background:#2e7d32;border:none;color:#fff;font-weight:600;
                 cursor:pointer;padding:8px 16px;border-radius:8px;">
          Confirmar
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

  if (!metodoPago.value) {
    window.showSnack("Selecciona un método de pago");
    return;
  }

  if (metodoPago.value === "bank_transfer" && !tempFile) {
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
  if (!user || !selectedAddressId) {
    window.showSnack("Faltan datos del pedido");
    return;
  }

  btnEnviar.disabled = true;
  loader.classList.remove("hidden");

  try {
    const { data: orderNumber, error: numErr } =
      await sb.rpc("next_order_number", { p_user_id: user.id });

    if (numErr || !orderNumber) {
      throw new Error("No se pudo generar el número de pedido");
    }

    // ✅ FIX: usar la nota congelada
    const orderNotes = orderNotesCache;

    const { data: order, error } = await sb
      .from("orders")
      .insert({
        user_id: user.id,
        address_id: selectedAddressId,
        order_number: orderNumber,
        total: totalPedido,
        payment_method:
          metodoPago.value === "bank_transfer"
            ? "bank_transfer"
            : "cash_on_delivery",
        status: "pending",
        order_notes: orderNotes
      })
      .select("id")
      .single();

    if (error || !order) {
      throw new Error("No se pudo crear el pedido");
    }

    console.log("✅ Pedido creado:", order.id, "- Trigger debería insertar notificación");

    await sb.from("order_items").insert(
      carrito.map(it => ({
        order_id: order.id,
        product_id: it.product_id,
        quantity: it.qty,
        price: it.price
      }))
    );

    if (tempFile) {
      const ext = tempFile.name.split(".").pop();
      const path = `${user.id}/${order.id}.${ext}`;

      await sb.storage
        .from("payment-receipts")
        .upload(path, tempFile, { upsert: true });

      const { data } = sb.storage
        .from("payment-receipts")
        .getPublicUrl(path);

      await sb.from("payment_receipts").insert({
        order_id: order.id,
        user_id: user.id,
        file_url: data.publicUrl,
        file_path: path
      });
    }

    /* 🔔 NOTIFICAR AL ADMIN (Simplificado) */
    // Usamos user_id: null para que la Edge Function detecte y haga broadcast a admins.
    await sb.from("notifications").insert({
      user_id: null, // <--- CLAVE PARA ADMIN
      title: "Nuevo pedido recibido 🛍️",
      message: `El cliente ${user.name || "Cliente"} ha realizado el pedido #${orderNumber}.`, // Corregido: 'body' -> 'message'
      type: "new_order",
      is_read: false,
      metadata: {
        order_id: order.id,
        order_number: orderNumber
      }
    });

    /* 📲 WHATSAPP AL GRUPO */
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

      const msg = `🫘 *Nuevo Pedido #${orderNumber}*\n\n👤 *Cliente:* ${user.name || "Cliente"}\n📞 *Tel:* ${customerPhone || "N/D"}\n📍 *Dirección:* ${addressLine || "N/D"}\n\n━━━ *Productos* ━━━\n\n${prodLines}\n${sep}\n💰 *Total:* L ${totalPedido.toFixed(2)}\n💳 *Pago:* ${metodoPago.value === "bank_transfer" ? "Transferencia bancaria" : "Efectivo contra entrega"}`;

      await fetch(`${waApi}/message/sendText/CafeCortero`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: waKey },
        body: JSON.stringify({ number: groupJid, text: msg })
      });
    } catch (e) {
      console.error("❌ Error al enviar WhatsApp al grupo:", e);
    }

    localStorage.setItem(CART_KEY, "[]");
    sessionStorage.removeItem("current_order_notes"); // limpieza correcta

    setTimeout(() => {
      location.href = `/pages/shop/recibo.html?id=${order.id}`;
    }, 1200);

  } catch (e) {
    console.error(e);
    window.showSnack("Error al enviar el pedido");
    btnEnviar.disabled = false;
  } finally {
    loader.classList.add("hidden");
  }
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

  // 🔑 Determinar si es primer pedido
  const sb = window.supabaseClient;
  const user = window.supabaseAuth.getCurrentUser();
  if (sb && user) {
    const { count } = await sb
      .from("orders")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id);
    isFirstOrder = (count === 0);
  }

  await cargarResumen();
  renderCarrito();
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
      window.location.href = "/pages/profile/datos_cliente.html";
    };
  }
})();
