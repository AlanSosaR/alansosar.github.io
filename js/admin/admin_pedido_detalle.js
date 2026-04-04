/* ============================================================
   ADMIN — DETALLE DE PEDIDO (STITCH DESIGN) | CAFÉ CORTERO
============================================================ */

console.log("🛠️ admin_pedido_detalle.js — INIT");

(() => {
    const sb = window.supabaseClient;
    if (!sb) throw new Error("❌ Supabase no inicializado");

    let orderData = null;

    const STATUS_LABELS = {
        pending: "Nuevo",
        processing: "En preparación",
        shipped: "Enviado",
        delivered: "Entregado",
        cancelled: "Cancelado"
    };

    // DOM Elements
    const DOM = {
        orderNumbers: document.querySelectorAll(".pedido-number, .pedido-number-mobile"),
        statusBadge: document.getElementById("detail-status"),
        date: document.getElementById("detail-date"),
        
        avatars: document.querySelectorAll("#detail-avatar, #detail-avatar-mobile"),
        clientNames: document.querySelectorAll("#detail-client-name, #detail-client-name-mobile"),
        clientEmails: document.querySelectorAll("#detail-client-email, #detail-client-email-mobile"),
        clientPhones: document.querySelectorAll("#detail-client-phone, #detail-client-phone-mobile"),
        shippingAddresses: document.querySelectorAll("#detail-shipping-address, #detail-shipping-address-mobile"),
        
        itemsBody: document.getElementById("detail-items-body"),
        
        subtotal: document.getElementById("detail-subtotal"),
        total: document.getElementById("detail-total-amount"),
        paymentTitle: document.getElementById("payment-title"),
        paymentDesc: document.getElementById("payment-desc"),
        paymentIcon: document.getElementById("payment-icon"),
        paymentReceiptLink: document.getElementById("payment-receipt-link"),
        
        orderNotes: document.getElementById("detail-order-notes"),
        
        statusActionsBox: document.getElementById("status-action-buttons"),
        timelineProgress: document.getElementById("timeline-progress"),
        btnContactClients: document.querySelectorAll("#btn-contact-client, #btn-contact-client-mobile")
    };

    let pendingAction = null;

    let isSnackbarResolving = false;

    /**
     * @function openSnackbar
     * Implementación robusta sincronizada con el sistema Maestro-Detalle
     */
    function openSnackbar(title, message, onConfirm, showCancel = true) {
        console.log("🎯 openSnackbar: INIT", title);
        const box = document.getElementById("snackbar-action");
        const btnConfirm = document.getElementById("snackbar-confirm");
        const btnCancel = document.getElementById("snackbar-cancel");
        const titleEl = document.getElementById("snackbar-title");
        const messageEl = document.getElementById("snackbar-message");

        if (!box || !btnConfirm || !btnCancel || !titleEl || !messageEl) {
            console.error("❌ Componentes del snackbar de detalle no encontrados");
            return;
        }

        titleEl.textContent = title;
        messageEl.textContent = message;
        isSnackbarResolving = false; // Reset debounce

        // Configuración de botones
        if (showCancel) {
            btnCancel.classList.remove("hidden");
            btnConfirm.textContent = "Confirmar";
        } else {
            btnCancel.classList.add("hidden");
            btnConfirm.textContent = "Aceptar";
        }

        const handleFinish = async (confirmed) => {
            if (isSnackbarResolving) return;
            isSnackbarResolving = true;

            console.log(`✅ [snackbar] RESOLVIENDO: ${confirmed}`);
            
            // Limpieza manual obligatoria
            btnConfirm.removeEventListener("click", onConfirmed);
            btnCancel.removeEventListener("click", onCancelled);

            // Ocultar primero para fluidez visual
            box.classList.add("hidden");

            if (confirmed && typeof onConfirm === "function") {
                await onConfirm();
            }
        };

        const onConfirmed = (e) => {
            e.preventDefault();
            console.log("✅ [snackbar-confirm] CLIC DETECTADO");
            handleFinish(true);
        };

        const onCancelled = (e) => {
            e.preventDefault();
            console.log("✅ [snackbar-cancel] CLIC DETECTADO");
            handleFinish(false);
        };

        // 1. Asignar listeners ANTES de mostrar
        btnConfirm.addEventListener("click", onConfirmed);
        btnCancel.addEventListener("click", onCancelled);

        // 2. Mostrar
        box.classList.remove("hidden");
        console.log("🎯 openSnackbar: VISIBLE");
    }

    /* =========================
       INIT
    ========================= */
    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
        if (!user || user.rol !== "admin") {
            window.location.href = "/";
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const orderId = params.get("id");

        if (!orderId || orderId === "undefined") {
            openSnackbar("Error de navegación", "No se proporcionó un ID de pedido válido.", () => history.back(), false);
            return;
        }

        await fetchOrderData(orderId);
    }

    /* =========================
       FETCH ORDER DATA
    ========================= */
    async function fetchOrderData(orderId) {
        try {
            const { data, error } = await sb
                .from("orders")
                .select(`
                    id,
                    user_id,
                    order_number,
                    total,
                    status,
                    created_at,
                    order_notes,
                    payment_method,
                    users ( name, email, phone ),
                    address:addresses ( country, state, city, street, postal_code, phone, full_name ),
                    items:order_items ( quantity, price, products ( name, presentation, grind_type, image_url ) ),
                    receipt:payment_receipts ( file_url )
                `)
                .eq("id", orderId)
                .single();

            if (error || !data) throw error;
            
            orderData = data;
            renderOrderData(orderData);
        } catch (err) {
            console.error("❌ Error cargando el detalle del pedido:", err);
            openSnackbar("Error", "Ocurrió un error cargando los detalles del pedido.", () => history.back(), false);
        }
    }

    /* =========================
       RENDER DATA
    ========================= */
    function renderOrderData(o) {
        const u = o.users || {};
        const a = o.address || {};

        // 1. Header Info
        DOM.orderNumbers.forEach(el => {
            el.textContent = `Pedido #${String(o.order_number).padStart(4, "0")}`;
        });
        
        DOM.date.textContent = `Realizado el ${new Date(o.created_at).toLocaleString("es-HN", {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
        })}`;
        
        // Mantener material symbol icon
        DOM.statusBadge.innerHTML = `<span class="material-symbols-outlined">check_circle</span> ${STATUS_LABELS[o.status] || o.status}`;
        DOM.statusBadge.className = `status-pill status-badge ${o.status}`; // Set specific color class

        // 2. Client Info
        const cName = a.full_name || u.name || "Cliente";
        
        DOM.clientNames.forEach(el => el.textContent = cName);
        DOM.clientEmails.forEach(el => el.textContent = u.email || "—");
        DOM.clientPhones.forEach(el => el.textContent = a.phone || u.phone || "—");
        
        // Initials Avatar
        const initials = cName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        DOM.avatars.forEach(el => el.textContent = initials);
        
        // Dirección Completa
        const addressParts = [a.street, a.city, a.state, a.country, a.postal_code].filter(Boolean);
        DOM.shippingAddresses.forEach(el => {
            el.innerHTML = addressParts.join("<br>") || "—";
        });

        // 3. Productos (Items) - Now rendering as Mobile Cards naturally
        DOM.itemsBody.innerHTML = "";
        let subtotalFloat = 0;

        if (o.items && o.items.length > 0) {
            o.items.forEach(item => {
                const prod = item.products || {};
                const name = prod.name || "Producto General";
                const lineTotal = item.quantity * item.price;
                subtotalFloat += lineTotal;
                
                const metaParts = [];
                if(prod.grind_type) metaParts.push(prod.grind_type);
                if(prod.presentation) metaParts.push(prod.presentation);
                const metaStr = metaParts.join(" • ");

                const imgHtml = prod.image_url 
                    ? `<img src="${prod.image_url}" alt="${name}">`
                    : `<span class="material-symbols-outlined pb-icon text-4xl opacity-30">coffee</span>`;

                const cardHtml = `
                    <div class="product-mobile-card">
                        <div class="pmc-img-wrapper">
                            ${imgHtml}
                        </div>
                        <div class="pmc-details">
                            <div>
                                <h3 class="pmc-name">${name}</h3>
                                <p class="pmc-meta">${metaStr}</p>
                            </div>
                            <div class="pmc-bottom">
                                <span class="pmc-qty">Qty: ${item.quantity}</span>
                                <span class="pmc-subtotal">$${lineTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `;
                DOM.itemsBody.insertAdjacentHTML('beforeend', cardHtml);
            });
        } else {
            DOM.itemsBody.innerHTML = `<div class="text-center p-8 text-sm opacity-60">No hay productos en este pedido.</div>`;
        }

        // 4. Pago y Totales
        DOM.subtotal.textContent = `L ${subtotalFloat.toFixed(2)}`;
        DOM.total.textContent = `L ${parseFloat(o.total || subtotalFloat).toFixed(2)}`;

        // Payment Method Logic
        if (o.payment_method === "Contra Entrega" || !o.receipt || o.receipt.length === 0) {
            DOM.paymentTitle.textContent = "Pago Contra Entrega";
            DOM.paymentDesc.textContent = "Se cobrará en el destino";
            DOM.paymentIcon.textContent = "local_shipping";
            DOM.paymentReceiptLink.classList.add("hidden");
        } else {
            DOM.paymentTitle.textContent = "Transferencia Verificada";
            DOM.paymentDesc.textContent = "Recibo cargado por el cliente";
            DOM.paymentIcon.textContent = "verified_user";
            DOM.paymentReceiptLink.href = o.receipt[0].file_url;
            DOM.paymentReceiptLink.classList.remove("hidden");
        }

        // 5. Order Notes
        if (o.order_notes) {
            DOM.orderNotes.textContent = o.order_notes;
            DOM.orderNotes.style.opacity = "1";
        } else {
            DOM.orderNotes.textContent = 'El cliente no dejó notas.';
            DOM.orderNotes.style.opacity = "0.7";
        }

        // WhatsApp Action
        DOM.btnContactClients.forEach(btn => {
            btn.onclick = () => {
                 const phone = a.phone || u.phone;
                 if (!phone) { 
                     openSnackbar("Atención", "El cliente no tiene teléfono registrado.", null, false);
                     return;
                 }
                 const cleanPhone = phone.replace(/\D/g, "");
                 const msg = encodeURIComponent(`Hola ${cName}, te contactamos de Café Cortero sobre tu pedido #${o.order_number}...`);
                 window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
            };
        });

        // Render Action Buttons & Timeline
        renderTimeline(o.status);
        renderActionButtons(o);
    }

    /* =========================
       TIMELINE
    ========================= */
    function renderTimeline(status) {
        const flow = ["pending", "processing", "shipped", "delivered"];
        const currentIndex = flow.indexOf(status);
        let progressPercent = 0;

        // Limpiar todas las clases active
        ["pending", "confirmed", "preparing", "shipped", "delivered"].forEach(s => {
            const el = document.getElementById(`step-${s}`);
            if(el) el.classList.remove("active");
        });

        if (status === "cancelled") {
            DOM.timelineProgress.style.width = "0%";
            DOM.timelineProgress.style.backgroundColor = "#ba1a1a";
            document.getElementById("step-pending")?.classList.add("active");
            if (document.querySelector("#step-pending .step-icon span")) {
                document.querySelector("#step-pending .step-icon span").textContent = "cancel";
            }
            return;
        }

        if (currentIndex === 0) progressPercent = 0; 
        if (currentIndex === 1) progressPercent = 50; 
        if (currentIndex === 2) progressPercent = 75; 
        if (currentIndex === 3) progressPercent = 100; 

        DOM.timelineProgress.style.width = `${progressPercent}%`;

        for (let i = 0; i <= currentIndex; i++) {
            let sId = flow[i];
            if (sId === "processing") {
                document.getElementById("step-confirmed")?.classList.add("active");
                document.getElementById("step-preparing")?.classList.add("active");
            } else if (document.getElementById(`step-${sId}`)) {
                document.getElementById(`step-${sId}`).classList.add("active");
            }
        }
    }

    /* =========================
       ACTION BUTTONS
    ========================= */
    function renderActionButtons(o) {
        DOM.statusActionsBox.innerHTML = "";

        if (o.status === "pending") {
            appendActionButton("Pasar a preparación", "hourglass_top", "accent", () => updateStatus(o.id, "processing"));
            appendActionButton("Anular", "cancel", "", () => updateStatus(o.id, "cancelled"));
        } else if (o.status === "processing") {
            appendActionButton("Marcar como enviado", "local_shipping", "accent", () => updateStatus(o.id, "shipped"));
        } else if (o.status === "shipped") {
            appendActionButton("Marcar como entregado", "done_all", "accent", () => updateStatus(o.id, "delivered"));
        } else {
            DOM.statusActionsBox.innerHTML = "<span class='text-muted text-sm'>No hay acciones disponibles para el estado actual.</span>";
        }
    }

    function appendActionButton(label, icon, extraClass, onClick) {
        const btn = document.createElement("button");
        btn.className = `status-btn ${extraClass}`;
        btn.innerHTML = `<span class="material-symbols-outlined">${icon}</span> ${label}`;
        
        btn.onclick = () => {
            openSnackbar("Confirmación requerida", `¿Seguro que deseas: ${label}?`, async () => {
                await onClick();
            });
        };
        DOM.statusActionsBox.appendChild(btn);
    }

    /* =========================
       UPDATE STATUS LOGIC
    ========================= */
    async function updateStatus(orderId, newStatus) {
        DOM.statusActionsBox.innerHTML = "Actualizando...";

        // 1. Update in DB
        const { error } = await sb
            .from("orders")
            .update({ status: newStatus })
            .eq("id", orderId);

        if (error) {
            console.error("❌ Error actualizando estado:", error);
            openSnackbar("Error", "Error al actualizar el estado", null, false);
            renderActionButtons(orderData); // Restore buttons
            return;
        }

        // 2. Notification System
        if (orderData.user_id) {
            await sendNotification(orderData.user_id, newStatus, orderData);
        }

        openSnackbar("¡Éxito!", "Estado actualizado correctamente.", null, false);

        // 3. Reload Data natively to reflect changes perfectly
        await fetchOrderData(orderId);
    }

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

        await sb.from("notifications").insert({
            user_id: userId,
            title: msg.title,
            message: msg.body,
            type: "order_status",
            is_read: false,
            metadata: {
                order_id: order.id,
                order_number: order.order_number,
                new_status: status
            }
        });
    }

    // ==========================================
    // INVOICE PRINTING HOOKS
    // ==========================================
    const handlePrint = () => {
        if (!orderData) return;
        sessionStorage.setItem("printOrderData", JSON.stringify(orderData));
        window.open("/pages/admin/admin-factura-impresion.html", "_blank");
    };
    document.getElementById("btnPrint")?.addEventListener("click", handlePrint);
    document.getElementById("btnPrintMobile")?.addEventListener("click", handlePrint);

})();
