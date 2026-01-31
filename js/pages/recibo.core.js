/**
 * 🧾 recibo.core.js — FINAL DEFINITIVO SINCRONIZADO
 * ---------------------------------------------------------
 * Proyecto: Café Cortero — Material 3 Expressive
 * Gestión de estados, carga de datos y UI de recibos.
 */

console.log("🧾 recibo.core.js — Sincronizado");

/* =========================================================
   1. SELECTORES Y CONTEXTO GLOBAL
========================================================= */
const $id = (id) => document.getElementById(id);

// Exponer contexto de solo lectura basado en la URL
window.ORDER_ID = new URLSearchParams(window.location.search).get("id");
window.IS_READ_ONLY = Boolean(window.ORDER_ID);

/* =========================================================
   2. NÚCLEO DE DATOS Y SESIÓN (Core Helpers)
========================================================= */

/**
 * Promesa que resuelve cuando el cliente Supabase está inyectado 
 */
window.esperarSupabase = () => {
  return new Promise((resolve) => {
    if (window.supabaseClient) return resolve();
    const intervalo = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(intervalo);
        resolve();
      }
    }, 50);
  });
};

/**
 * Recupera el usuario desde el caché local con fallback de seguridad
 */
window.getUserCache = () => {
  try {
    // Intento 1: LocalStorage directo del proyecto
    const user = localStorage.getItem("cortero_user");
    if (user) return JSON.parse(user);
    
    // Intento 2: Persistencia nativa de Supabase Auth
    const sbKey = Object.keys(localStorage).find(k => k.includes("-auth-token"));
    if (sbKey) {
      const session = JSON.parse(localStorage.getItem(sbKey));
      return session?.user || null;
    }
    return null;
  } catch (err) {
    console.error("Error al recuperar usuario:", err);
    return null;
  }
};

/**
 * Feedback visual estilo Material 3
 */
window.showSnack = (msg, duration = 4000) => {
  const bar = $id("snackbar");
  if (!bar) return;

  const textEl = bar.querySelector(".snack-text") || bar;
  textEl.textContent = msg;
  
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), duration);
};

/* =========================================================
   3. GESTIÓN DE INTERFAZ (UI Expressive)
========================================================= */

/**
 * Ajusta la interfaz para modo recibo (Solo Lectura)
 */
window.aplicarModoRecibo = () => {
  // Ocultar elementos de selección de pago (CheckOut)
  document.querySelector(".pago-select-label")?.classList.add("hidden");
  
  // Filtrar botones: ocultamos el de "Pagar/Enviar" pero no el de "Cancelar"
  const botones = document.querySelectorAll(".btn-primary");
  botones.forEach(btn => {
    if (!btn.id.includes("Cancelar") && !btn.classList.contains("btn-cancelar")) {
      btn.classList.add("hidden");
    }
  });
};

/**
 * Actualiza la Píldora de estado y la barra de progreso
 */
window.aplicarProgresoPedido = (status) => {
  const pillContainer = $id("estado-pildora-container");
  const stepper = document.querySelector(".progreso-bar");
  if (!pillContainer) return;

  const config = {
    pending: { label: "Pendiente", class: "status-pending", icon: "payments", step: 1 },
    payment_review: { label: "Revisando Pago", class: "status-review", icon: "fact_check", step: 1 },
    processing: { label: "En Preparación", class: "status-processing", icon: "coffee", step: 2 },
    shipped: { label: "En Camino", class: "status-shipped", icon: "local_shipping", step: 3 },
    delivered: { label: "Entregado", class: "status-delivered", icon: "check_circle", step: 4 },
    cancelled: { label: "Cancelado", class: "status-cancelled", icon: "cancel", step: 0 }
  };

  const actual = config[status] || config.pending;

  // Renderizar Píldora
  pillContainer.innerHTML = `
    <div class="status-pill ${actual.class}">
      <span class="material-symbols-outlined">${actual.icon}</span>
      <span>${actual.label}</span>
    </div>
  `;

  // Actualizar Stepper Visual (M3)
  if (stepper) {
    const steps = document.querySelectorAll(".step");
    const lines = document.querySelectorAll(".line");
    
    steps.forEach((s, i) => {
      s.style.background = i < actual.step ? "#33673B" : "#e0e0e0";
    });
    lines.forEach((l, i) => {
      l.style.background = i < actual.step - 1 ? "#33673B" : "#e0e0e0";
    });
  }
};

/* =========================================================
   4. CARGA DE DATOS DESDE BASE DE DATOS
========================================================= */

/**
 * Obtiene y muestra la información completa del pedido
 */
window.cargarPedidoExistente = async (orderId) => {
  if (!orderId) return;
  const sb = window.supabaseClient;

  const { data: pedido, error } = await sb
    .from("orders")
    .select(`
      *,
      users(name, email, phone),
      addresses(state, city, street),
      order_items(quantity, price, products(name)),
      payment_receipts(file_url, created_at, review_status)
    `)
    .eq("id", orderId)
    .single();

  if (error || !pedido) {
    window.showSnack("Error: No se encontró el registro del pedido");
    return;
  }

  // 1. Datos de Cabecera
  if ($id("numeroPedido")) $id("numeroPedido").textContent = pedido.order_number;
  const fecha = new Date(pedido.created_at);
  if ($id("fechaPedido")) $id("fechaPedido").textContent = fecha.toLocaleDateString();
  if ($id("horaPedido")) $id("horaPedido").textContent = fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  if ($id("totalPedido")) $id("totalPedido").textContent = `L ${pedido.total.toFixed(2)}`;
  if ($id("notaCliente")) $id("notaCliente").textContent = pedido.order_notes || "Sin referencia";

  // 2. Información del Cliente
  if (pedido.users && $id("nombreCliente")) {
    $id("nombreCliente").textContent = pedido.users.name;
    $id("correoCliente").textContent = pedido.users.email;
    $id("telefonoCliente").textContent = pedido.users.phone;
  }

  // 3. Renderizado de Productos (Material 3 Cards)
  const lista = $id("listaProductos");
  if (lista) {
    lista.innerHTML = pedido.order_items.map(it => `
      <div class="cafe-item">
        <div>
          <span class="cafe-nombre">${it.products.name}</span>
          <div class="cafe-cantidad">Cant: <span class="cafe-qty">${it.quantity}</span></div>
        </div>
        <span class="cafe-precio">L ${(it.quantity * it.price).toFixed(2)}</span>
      </div>
    `).join("");
  }

  // 4. Gestión de Comprobante (Si aplica)
  const preview = $id("previewComprobante");
  const img = $id("imgComprobante");
  if (pedido.payment_method === "bank_transfer" && pedido.payment_receipts?.length > 0) {
    if (preview && img) {
      preview.classList.remove("hidden");
      img.src = pedido.payment_receipts[0].file_url;
    }
  }

  // 5. Determinar y aplicar Estado
  let statusVisual = pedido.status;
  if (pedido.payment_method === "bank_transfer" && pedido.status === "pending" && pedido.payment_receipts?.length > 0) {
    statusVisual = "payment_review";
  }

  window.aplicarProgresoPedido(statusVisual);
};

/* =========================================================
   5. FIN DE CORE — ESPERANDO INSTRUCCIÓN DE VISTA
========================================================= */
// Nota: La inicialización se maneja en recibo.view.js para 
// asegurar la persistencia de la sesión de usuario.
