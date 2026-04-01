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
        orderNumber: document.getElementById("detail-order-number"),
        statusBadge: document.getElementById("detail-status"),
        date: document.getElementById("detail-date"),
        
        avatar: document.getElementById("detail-avatar"),
        clientName: document.getElementById("detail-client-name"),
        clientEmail: document.getElementById("detail-client-email"),
        clientPhone: document.getElementById("detail-client-phone"),
        shippingAddress: document.getElementById("detail-shipping-address"),
        
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
        btnContactClient: document.getElementById("btn-contact-client")
    };

    let pendingAction = null;

    /* =========================
       SNACKBAR
    ========================= */
    function openSnackbar(title, message, onConfirm, showCancel = true) {
        const box = document.getElementById("snackbar-action");
        const btnConfirm = document.getElementById("snackbar-confirm");
        const btnCancel = document.getElementById("snackbar-cancel");

        document.getElementById("snackbar-title").textContent = title;
        document.getElementById("snackbar-message").textContent = message;

        btnConfirm.onclick = null;
        btnCancel.onclick = null;

        if (showCancel) {
            btnCancel.classList.remove("hidden");
            btnConfirm.textContent = "Confirmar";
        } else {
            btnCancel.classList.add("hidden");
            btnConfirm.textContent = "Aceptar";
        }

        pendingAction = onConfirm;

        btnConfirm.onclick = async () => {
            box.classList.add("hidden");
            const action = pendingAction;
            pendingAction = null;
            if (typeof action === "function") await action();
        };

        btnCancel.onclick = () => {
            pendingAction = null;
            box.classList.add("hidden");
        };

        box.classList.remove("hidden");
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
        DOM.orderNumber.textContent = `Pedido #${String(o.order_number).padStart(4, "0")}`;
        DOM.date.textContent = `Realizado el ${new Date(o.created_at).toLocaleString("es-HN", {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
        })}`;
        
        DOM.statusBadge.textContent = STATUS_LABELS[o.status] || o.status;
        DOM.statusBadge.className = `status-pill ${o.status}`; // Set specific color class

        // 2. Client Info
        const cName = a.full_name || u.name || "Cliente";
        DOM.clientName.textContent = cName;
        DOM.clientEmail.textContent = u.email || "—";
        DOM.clientPhone.textContent = a.phone || u.phone || "—";
        
        // Initials Avatar
        const initials = cName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        DOM.avatar.textContent = initials;
        
        // Dirección Completa
        const addressParts = [a.street, a.city, a.state, a.country, a.postal_code].filter(Boolean);
        DOM.shippingAddress.innerHTML = addressParts.join("<br>") || "—";

        // 3. Productos (Items)
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
                    : `<span class="material-symbols-outlined pb-icon">coffee</span>`;

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>
                        <div class="product-cell">
                            <div class="product-img-wrapper flex justify-center items-center">
                                ${imgHtml}
                            </div>
                            <div>
                                <p class="product-name">${name}</p>
                                <p class="product-meta">${metaStr}</p>
                            </div>
                        </div>
                    </td>
                    <td class="price-text">L ${parseFloat(item.price).toFixed(2)}</td>
                    <td class="qty-text">x${item.quantity}</td>
                    <td class="subtotal-text">L ${lineTotal.toFixed(2)}</td>
                `;
                DOM.itemsBody.appendChild(tr);
            });
        } else {
            DOM.itemsBody.innerHTML = `<tr><td colspan="4" class="text-center p-8">No hay productos en este pedido.</td></tr>`;
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
            DOM.orderNotes.textContent = `"${o.order_notes}"`;
            DOM.orderNotes.style.opacity = "1";
        } else {
            DOM.orderNotes.textContent = '"Sin notas adicionales"';
            DOM.orderNotes.style.opacity = "0.5";
        }

        // WhatsApp Action
        DOM.btnContactClient.onclick = () => {
             const phone = a.phone || u.phone;
             if (!phone) { 
                 openSnackbar("Atención", "El cliente no tiene teléfono registrado.", null, false);
                 return;
             }
             const cleanPhone = phone.replace(/\D/g, "");
             const msg = encodeURIComponent(`Hola ${cName}, te contactamos de Café Cortero sobre tu pedido #${o.order_number}...`);
             window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
        };

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
            appendActionButton("Cancelar pedido", "cancel", "", () => updateStatus(o.id, "cancelled"));
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

})();
