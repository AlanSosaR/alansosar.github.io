/* ============================================================
   ADMIN — PEDIDOS | CAFÉ CORTERO
============================================================ */

console.log("🛠️ admin-pedidos.js — INIT");

(() => {
  const sb = window.supabaseClient;
  if (!sb) throw new Error("❌ Supabase no inicializado");

  const EMPTY_BASE = window.location.origin + "/imagenes/empty/";
  let orders = [];
  let filtered = [];
  let activeIndex = 0;
  let currentStatus = "pending";
  let search = "";
  let pendingAction = null;
  let userSelected = false;
  let selectedOrder = null; // ✅ Guardar objeto actual

  /* =========================
     STATUS MAP
  ========================= */
  const STATUS_GROUPS = {
    pending: ["pending"],
    processing: ["processing"],
    shipped: ["shipped"],
    delivered: ["delivered"],
    cancelled: ["cancelled"]
  };

  const STATUS_LABELS = {
    pending: "Nuevo",
    processing: "En preparación",
    shipped: "Enviado",
    delivered: "Entregado",
    cancelled: "Cancelado"
  };

  /* =========================
     INIT
  ========================= */
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
    if (!user || user.rol !== "admin") return;

    bindControls(); // ✅ header:search y header:filter
    bindDetailButtons(); // ✅ print, contact

    await loadOrdersByStatus(currentStatus);
    renderCarousel();

    if (filtered.length) {
      selectOrderByIndex(0);
    } else {
      showEmpty();
    }
  }

  function bindDetailButtons() {
    document.getElementById("btnPrint")?.addEventListener("click", () => window.print());
    document.getElementById("btnContactCustomer")?.addEventListener("click", () => {
        if (!selectedOrder) return;
        const u = selectedOrder.users || {};
        const email = u.email || "";
        if (email) {
            const subject = `Estado de tu pedido #${String(selectedOrder.order_number).padStart(3, '0')} — Café Cortero`;
            window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
        } else {
            console.warn("No hay email para contactar");
        }
    });
  }

  /* =========================
     LOAD ORDERS
  ========================= */
  async function loadOrdersByStatus(statusKey) {
    let query = sb
      .from("orders")
      .select(`
        id,
        user_id,
        order_number,
        total,
        status,
        created_at,
        users ( name, email ),
        address:addresses ( country, state, city, street, postal_code, phone, full_name ),
        items:order_items ( quantity, price, products ( name ) ),
        receipt:payment_receipts ( file_url )
      `)
      .order("created_at", { ascending: false });

    const statuses = STATUS_GROUPS[statusKey];
    if (statuses) query = query.in("status", statuses);

    const { data, error } = await query;
    if (error) {
      console.error("❌ Error cargando pedidos:", error);
      orders = [];
      filtered = [];
      return;
    }

    orders = data || [];
    filtered = [...orders];
  }

  /* =========================
     GLOBAL SEARCH (HEADER)
  ========================= */
  function applyGlobalSearch(query) {
    if (!query) {
      filtered = [...orders];
      return;
    }

    const q = query.toLowerCase();

    filtered = orders.filter(o => {
      // Buscar en número de pedido
      const matchNum = String(o.order_number).includes(q) ||
        String(o.order_number).padStart(3, "0").includes(q);

      // Buscar en cliente (email o nombre de tabla users)
      const matchUser = (o.users?.name || "").toLowerCase().includes(q) ||
        (o.users?.email || "").toLowerCase().includes(q);

      // Buscar en dirección (teléfono, nombre completo, ciudad, etc)
      const matchAddress = (o.address?.phone || "").includes(q) ||
        (o.address?.full_name || "").toLowerCase().includes(q) ||
        (o.address?.city || "").toLowerCase().includes(q) ||
        (o.address?.street || "").toLowerCase().includes(q);

      // Buscar en productos
      const matchProducts = o.items?.some(i =>
        (i.products?.name || "").toLowerCase().includes(q)
      );

      return matchNum || matchUser || matchAddress || matchProducts;
    });
  }

  /* =========================
     CARRUSEL (AHORA LISTA VERTICAL)
  ========================= */
  function renderCarousel() {
    applyGlobalSearch(search);

    const wrap = document.getElementById("orders-carousel");
    const tpl = document.getElementById("tpl-order-card");
    const related = document.querySelector(".admin-related");

    wrap.innerHTML = "";

    if (!filtered.length) {
      if (related) related.classList.add("hidden");
      showEmpty();
      return;
    }

    if (related) related.classList.remove("hidden");

    filtered.forEach((o, index) => {
      const node = tpl.content.cloneNode(true);
      const card = node.querySelector(".order-card");

      card.dataset.index = index;

      node.querySelector(".o-card-number").textContent =
        `#${String(o.order_number).padStart(3, "0")}`;

      node.querySelector(".o-card-total").textContent =
        `L ${Number(o.total).toLocaleString("es-HN", { minimumFractionDigits: 2 })}`;

      const statusEl = node.querySelector(".o-card-status");
      const statusLabel = STATUS_LABELS[o.status] || o.status;
      statusEl.textContent = statusLabel;
      
      // Clases dinámicas de Tailwind según estado
      statusEl.classList.add(`status-badge-${o.status}`);

      node.querySelector(".o-card-client").textContent = o.users?.name || o.address?.full_name || "Cliente";

      const img = node.querySelector(".order-card-img");
      const placeholder = node.querySelector(".order-card-placeholder");

      if (o.receipt?.[0]?.file_url) {
        img.src = o.receipt[0].file_url;
        img.classList.remove("hidden");
        placeholder.classList.add("hidden");
      } else {
        img.classList.add("hidden");
        placeholder.classList.remove("hidden");
      }

      card.onclick = () => {
        userSelected = true;
        selectOrderByIndex(index);
      };

      wrap.appendChild(node);
    });

    requestAnimationFrame(() => {
      applySelection();
    });
  }

  /* =========================
     SELECT ORDER
  ========================= */
  function selectOrderByIndex(index) {
    if (!filtered[index]) return;

    activeIndex = index;
    applySelection();

    const preview = document.getElementById("admin-order-preview");
    preview.classList.remove("hidden");
    document.getElementById("admin-empty-state").classList.add("hidden");

    renderPreview(filtered[index]);

    if (userSelected) {
      userSelected = false;
    }
  }

  function explainScrollToPreview() {
    const preview = document.getElementById("admin-order-preview");
    requestAnimationFrame(() => {
      preview.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function applySelection() {
    document.querySelectorAll(".order-card")
      .forEach(c => c.classList.remove("is-selected"));

    const card = document.querySelector(
      `.order-card[data-index="${activeIndex}"]`
    );
    card?.classList.add("is-selected");
  }

  /* =========================
     PREVIEW
  ========================= */
  function renderPreview(o) {
    selectedOrder = o; // ✅ Guardamos para persistencia
    const u = o.users || {};
    const a = o.address || {};

    document.getElementById("o-number").textContent =
      `Pedido #${String(o.order_number).padStart(3, "0")}`;
    
    // Formato fecha: 12 Octubre, 2023
    const date = new Date(o.created_at);
    const day = date.getDate();
    const month = date.toLocaleString('es-ES', { month: 'long' });
    const year = date.getFullYear();
    document.getElementById("o-date").textContent = `Realizado el ${day} de ${month.charAt(0).toUpperCase() + month.slice(1)}, ${year}`;

    document.getElementById("o-client-name").textContent =
      u.name || a.full_name || "Cliente";
    document.getElementById("o-phone").textContent = a.phone || "—";
    document.getElementById("o-email").textContent = u.email || "—";

    const table = document.getElementById("order-items-table");
    table.innerHTML = "";

    let total = 0;
    o.items?.forEach(item => {
      const subtotal = item.quantity * item.price;
      total += subtotal;

      table.insertAdjacentHTML("beforeend", `
        <tr>
          <td class="py-6 flex items-center gap-4">
            <div class="w-14 h-14 rounded-lg bg-surface-container overflow-hidden">
              <img src="/imagenes/logo.png" class="w-full h-full object-contain p-2" />
            </div>
            <div>
              <p class="font-bold text-on-surface">${item.products?.name}</p>
              <p class="text-xs text-tertiary">Cantidad: ${item.quantity}</p>
            </div>
          </td>
          <td class="py-6 text-center font-bold">${item.quantity}</td>
          <td class="py-6 text-right font-medium">L ${Number(item.price).toLocaleString("es-HN", { minimumFractionDigits: 2 })}</td>
          <td class="py-6 text-right font-bold text-primary">L ${subtotal.toLocaleString("es-HN", { minimumFractionDigits: 2 })}</td>
        </tr>
      `);
    });

    document.getElementById("o-total").textContent = `L ${total.toLocaleString("es-HN", { minimumFractionDigits: 2 })}`;
    document.getElementById("o-address").textContent =
      [a.street, a.city, a.state, a.country].filter(Boolean).join(", ") || "—";
    document.getElementById("o-reference").textContent = a.postal_code || "—";

    updateTimeline(o.status);
    renderMedia(o);
    renderStatusActions(o);
  }

  function updateTimeline(status) {
      const progress = document.getElementById("timeline-progress-bar");
      const steps = {
          "pending": { pct: "0%", active: [".step-pending"] },
          "processing": { pct: "33%", active: [".step-pending", ".step-processing"] },
          "shipped": { pct: "66%", active: [".step-pending", ".step-processing", ".step-shipped"] },
          "delivered": { pct: "100%", active: [".step-pending", ".step-processing", ".step-shipped", ".step-delivered"] },
          "cancelled": { pct: "0%", active: [] }
      };

      const config = steps[status] || steps.pending;
      progress.style.width = config.pct;

      // Reset steps
      document.querySelectorAll("#order-timeline .status-icon").forEach(icon => {
          icon.classList.remove("bg-primary", "text-on-primary");
          icon.classList.add("bg-surface-variant");
      });

      // Activate steps
      config.active.forEach(selector => {
          const step = document.querySelector(selector + " .status-icon");
          if(step) {
              step.classList.remove("bg-surface-variant");
              step.classList.add("bg-primary", "text-on-primary", "shadow-lg");
          }
      });
  }

  /* =========================
     MEDIA
  ========================= */
  function renderMedia(o) {
    const media = document.getElementById("order-media");
    const cash = document.getElementById("cash-payment");
    const receipt = document.getElementById("receipt-payment");

    media.classList.remove("hidden");
    cash.classList.add("hidden");
    receipt.classList.add("hidden");

    if (o.receipt?.[0]?.file_url) {
      receipt.classList.remove("hidden");
      document.getElementById("receipt-img").src = o.receipt[0].file_url;
    } else {
      cash.classList.remove("hidden");
    }
  }

  /* =========================
     STATUS ACTIONS
  ========================= */
  function renderStatusActions(o) {
    const btnAccept = document.getElementById("btnAccept");
    const btnReject = document.getElementById("btnReject");
    const btnShip = document.getElementById("btnShip");
    const btnDeliver = document.getElementById("btnDeliver");

    [btnAccept, btnReject, btnShip, btnDeliver]
      .forEach(b => b.classList.add("hidden"));

    if (o.status === "pending") {
      btnAccept.classList.remove("hidden");
      btnReject.classList.remove("hidden");

      btnAccept.onclick = () =>
        openSnackbar(
          "Pasar a preparación",
          "¿Deseas marcar este pedido como En preparación?",
          () => updateStatus(o.id, "processing")
        );

      btnReject.onclick = () =>
        openSnackbar(
          "Cancelar pedido",
          "Esta acción no se puede deshacer",
          () => updateStatus(o.id, "cancelled")
        );
    }

    if (o.status === "processing") {
      btnShip.classList.remove("hidden");
      btnShip.onclick = () =>
        openSnackbar(
          "Marcar como enviado",
          "Confirma el envío del pedido",
          () => updateStatus(o.id, "shipped")
        );
    }

    if (o.status === "shipped") {
      btnDeliver.classList.remove("hidden");
      btnDeliver.onclick = () =>
        openSnackbar(
          "Marcar como entregado",
          "Confirma entrega al cliente",
          () => updateStatus(o.id, "delivered")
        );
    }
  }

  /* =========================
     UPDATE STATUS
  ========================= */
  async function updateStatus(orderId, newStatus) {
    // 1. Obtener datos del pedido para la notificación
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    // 2. Actualizar estado
    const { error } = await sb
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      console.error("❌ Error actualizando estado:", error);
      alert("No se pudo actualizar el estado. Revisa la consola.");
      return;
    }

    // 3. Enviar notificación al usuario (si corresponde)
    if (orderToUpdate.users?.id || orderToUpdate.user_id) {
      const userId = orderToUpdate.users?.id || orderToUpdate.user_id; // Ajuste según tu estructura (join vs raw)
      // Nota: En tu select original tienes `users ( name, email )`, pero no el ID anidado si no lo pides explícitamente.
      // Sin embargo, `user_id` suele estar en la tabla `orders` base.
      // Vamos a confiar en `orderToUpdate.user_id` si está disponible, o modificar el select.

      // Revisando `loadOrdersByStatus`, NO estamos seleccionando user_id explícitamente,
      // pero Supabase a veces lo devuelve si es columna.
      // Para estar seguros, usaremos el `user_id` de la orden (columna FK).
      // Si `orders` no tiene `user_id` cargado, fallará.
      // VOY A MODIFICAR `loadOrdersByStatus` TAMBIÉN para asegurar `user_id`.

      await sendNotification(userId, newStatus, orderToUpdate);
    }

    // 4. Refrescar UI
    await loadOrdersByStatus(currentStatus);
    renderCarousel();

    if (filtered.length) {
      activeIndex = 0;
      selectOrderByIndex(0);
    } else {
      showEmpty();
    }
  }

  /* =========================
     NOTIFICACIONES
  ========================= */
  async function sendNotification(userId, status, order) {
    if (!userId) return;

    const config = {
      processing: {
        title: "Pedido en preparación ☕",
        body: `¡Tu pedido #${order.order_number} se está preparando! Pronto estará listo.`
      },
      shipped: {
        title: "Pedido en camino 🚚",
        body: `¡Tu pedido #${order.order_number} ha sido enviado! Espéralo pronto.`
      },
      delivered: {
        title: "Pedido entregado ✅",
        body: `¡Tu pedido #${order.order_number} ha sido entregado! Gracias por tu compra.`
      },
      cancelled: {
        title: "Pedido cancelado ❌",
        body: `Tu pedido #${order.order_number} ha sido cancelado.`
      }
    };

    const msg = config[status];
    if (!msg) return;

    console.log(`🔔 Enviando notificación a ${userId} (${status})`);

    const { error } = await sb.from("notifications").insert({
      user_id: userId,
      title: msg.title,
      message: msg.body, // Corregido: 'body' -> 'message' según schema
      type: "order_status",
      is_read: false,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        new_status: status
      }
    });

    if (error) {
      console.error("❌ Error enviando notificación:", error);
    } else {
      console.log("✅ Notificación enviada correctamente");
    }
  }

  /* =========================
     SNACKBAR (FIX DEFINITIVO)
  ========================= */
  function openSnackbar(title, message, onConfirm) {
    const box = document.getElementById("snackbar-action");
    const btnConfirm = document.getElementById("snackbar-confirm");
    const btnCancel = document.getElementById("snackbar-cancel");

    document.getElementById("snackbar-title").textContent = title;
    document.getElementById("snackbar-message").textContent = message;

    // Limpia handlers anteriores (CRÍTICO)
    btnConfirm.onclick = null;
    btnCancel.onclick = null;

    pendingAction = onConfirm;

    btnConfirm.onclick = async () => {
      box.classList.add("hidden");

      const action = pendingAction;
      pendingAction = null;

      if (typeof action === "function") {
        await action();
      }
    };

    btnCancel.onclick = () => {
      pendingAction = null;
      box.classList.add("hidden");
    };

    box.classList.remove("hidden");
  }

  /* =========================
     CONTROLS (GLOBAL HEADER) — FIX REAL
  ========================= */
  function bindControls() {
    /* ---------- FILTRO POR ESTADO ---------- */
    document.addEventListener("header:filter", async e => {
      currentStatus = e.detail;
      userSelected = false;

      await loadOrdersByStatus(currentStatus);
      renderCarousel();

      if (filtered.length) {
        activeIndex = 0;
        selectOrderByIndex(0);
      } else {
        showEmpty();
      }
    });

    /* ---------- BUSCADOR GLOBAL ---------- */
    document.addEventListener("header:search", e => {
      search = (e.detail || "").trim();
      userSelected = false;

      renderCarousel();

      if (filtered.length) {
        activeIndex = 0;
        selectOrderByIndex(0);
      } else {
        showEmpty();
      }
    });
  }

  /* =========================
     PAGINATION (MOCK FOR NOW)
  ========================= */
  function updatePaginationInfo() {
      const info = document.getElementById("page-info");
      if (info) {
          info.textContent = `Viendo ${filtered.length} de ${orders.length}`;
      }
  }

  /* =========================
     EMPTY
  ========================= */
  function showEmpty() {
    document.getElementById("admin-order-preview").classList.add("hidden");
    document.querySelector(".admin-related").classList.add("hidden");

    const empty = document.getElementById("admin-empty-state");
    if (!empty) return;

    const title = empty.querySelector(".empty-title");
    const text = empty.querySelector(".empty-text");
    const img = empty.querySelector(".empty-illustration");

    const config = {
      new: ["Todo está al día por aquí", "No hay nuevos pedidos pendientes de revisión.", "pending.svg"],
      processing: ["Nada en preparación", "No tienes pedidos que se estén preparando ahora mismo.", "processing.svg"],
      shipped: ["Sin envíos activos", "Todos los pedidos enviados han sido gestionados.", "shipped.svg"],
      delivered: ["Historial vacío", "Aquí aparecerán los pedidos que ya han sido entregados.", "delivered.svg"],
      cancelled: ["Sin cancelaciones", "No hay pedidos cancelados en esta sección.", "cancelled.svg"],
      search: ["No hay resultados", `No encontramos nada para "${search}". Prueba con otro término.`, "pending.svg"]
    };

    // Si hay búsqueda activa y no hay resultados, priorizamos mensaje de búsqueda
    const key = (search && filtered.length === 0) ? "search" : currentStatus;
    const [t, d, imgName] = config[key] || config.new;

    title.textContent = t;
    text.textContent = d;

    if (img) {
      img.src = EMPTY_BASE + imgName;
      img.alt = t;
      img.classList.remove("hidden");
    }

    empty.classList.remove("hidden");
  }
})();
