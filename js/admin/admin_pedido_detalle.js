/* ============================================================
   ADMIN — DETALLE DE PEDIDO (MIS PEDIDOS STYLE) | CAFÉ CORTERO
   ============================================================ */

console.log("🛠️ admin_pedido_detalle.js — INIT");

(() => {
    const sb = window.supabaseClient;
    if (!sb) throw new Error("❌ Supabase no inicializado");

    let orderData = null;
    let isPOS = false;
    let posPaymentMethod = null;

    const STATUS_LABELS = {
        pending: "Nuevo",
        processing: "En preparación",
        shipped: "Enviado",
        delivered: "Entregado",
        cancelled: "Cancelado"
    };

    const STATUS_BADGE_CLASS = {
        pending: "pending",
        processing: "preparing",
        preparing: "preparing",
        shipped: "shipped",
        delivered: "delivered",
        cancelled: "cancelled"
    };

    // DOM Elements
    const DOM = {
        orderNumber: document.getElementById("detail-order-number"),
        orderNumberMobile: document.getElementById("detail-order-number-mobile"),
        statusBadge: document.getElementById("detail-status"),
        statusBadgeMobile: document.getElementById("detail-status-mobile"),
        date: document.getElementById("detail-date"),

        clientName: document.getElementById("detail-client-name"),
        clientEmail: document.getElementById("detail-client-email"),
        clientPhone: document.getElementById("detail-client-phone"),
        shippingAddress: document.getElementById("detail-shipping-address"),

        itemsBody: document.getElementById("detail-items-body"),

        paymentMethod: document.getElementById("detail-payment-method"),
        paymentDate: document.getElementById("detail-payment-date"),
        total: document.getElementById("detail-total-amount"),
        receiptContainer: document.getElementById("receipt-container"),
        paymentReceiptLink: document.getElementById("payment-receipt-link"),

        orderNotes: document.getElementById("detail-order-notes"),

        statusActionsBox: document.getElementById("status-action-buttons"),
        statusActionCard: document.getElementById("status-action-card"),
        timelineProgress: document.getElementById("timeline-progress"),
    };

    let pendingAction = null;
    let isSnackbarResolving = false;

    function openSnackbar(title, message, onConfirm, showCancel = true) {
        const box = document.getElementById("snackbar-action");
        const btnConfirm = document.getElementById("snackbar-confirm");
        const btnCancel = document.getElementById("snackbar-cancel");
        const titleEl = document.getElementById("snackbar-title");
        const messageEl = document.getElementById("snackbar-message");

        if (!box || !btnConfirm || !btnCancel || !titleEl || !messageEl) return;

        titleEl.textContent = title;
        messageEl.textContent = message;
        isSnackbarResolving = false;

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
            btnConfirm.removeEventListener("click", onConfirmed);
            btnCancel.removeEventListener("click", onCancelled);
            box.classList.add("hidden");
            if (confirmed && typeof onConfirm === "function") await onConfirm();
        };

        const onConfirmed = (e) => { e.preventDefault(); handleFinish(true); };
        const onCancelled = (e) => { e.preventDefault(); handleFinish(false); };

        btnConfirm.addEventListener("click", onConfirmed);
        btnCancel.addEventListener("click", onCancelled);
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
                    address_id,
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
            isPOS = !data.address_id;

            if (isPOS) {
                const { data: fm } = await sb
                    .from("finanzas_movimientos")
                    .select("metodo_pago")
                    .eq("order_id", orderId)
                    .limit(1);
                posPaymentMethod = fm?.[0]?.metodo_pago || null;
            }

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
        const orderLabel = `Pedido #${String(o.order_number).padStart(4, "0")}`;
        if (DOM.orderNumber) DOM.orderNumber.textContent = orderLabel;
        if (DOM.orderNumberMobile) DOM.orderNumberMobile.textContent = orderLabel;

        if (DOM.date) {
            DOM.date.textContent = `Realizado el ${new Date(o.created_at).toLocaleString("es-HN", {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}`;
        }

        const statusLabel = STATUS_LABELS[o.status] || o.status;
        const badgeClass = STATUS_BADGE_CLASS[o.status] || "pending";

        if (DOM.statusBadge) {
            DOM.statusBadge.innerHTML = `<span class="material-symbols-outlined">check_circle</span> ${statusLabel}`;
            DOM.statusBadge.className = `status-badge-stitch ${badgeClass}`;
        }
        if (DOM.statusBadgeMobile) {
            DOM.statusBadgeMobile.textContent = statusLabel.toUpperCase();
            DOM.statusBadgeMobile.className = `status-badge-stitch ${badgeClass}`;
        }

        // 2. Client Info — POS variant vs regular
        if (isPOS) {
            const leftCard = document.querySelector(".info-card-stitch");
            if (leftCard) {
                leftCard.innerHTML = `
                    <h3 class="card-title-stitch"><img src="/imagenes/clasificacion.png" class="card-title-icon-img" alt="" /> Productos vendidos</h3>
                    <div id="pos-items-list" class="items-mini-list"></div>
                `;
                const posList = document.getElementById("pos-items-list");
                if (posList && o.items) {
                    o.items.forEach(item => {
                        const prod = item.products || {};
                        const name = prod.name || "Producto";
                        const imgUrl = prod.image_url
                            ? (prod.image_url.startsWith("http") ? prod.image_url : `https://${prod.image_url}`)
                            : null;
                        const div = document.createElement("div");
                        div.className = "summary-item";
                        div.innerHTML = `
                            ${imgUrl ? `<img src="${imgUrl}" alt="${name}" class="item-img">` : `<div class="item-img-placeholder"><span class="material-symbols-outlined">coffee</span></div>`}
                            <div class="item-info">
                                <div class="item-name">${name}</div>
                                <div class="item-details">Cant: ${item.quantity}</div>
                            </div>
                            <span class="item-price">L ${item.price.toFixed(2)} c/u</span>
                        `;
                        posList.appendChild(div);
                    });
                }
            }
            const rightItems = document.getElementById("detail-items-body");
            if (rightItems) rightItems.style.display = "none";
            const adminRow = document.getElementById("admin-row");
            const adminNameEl = document.getElementById("detail-admin-name");
            if (adminRow) adminRow.style.display = "flex";
            if (adminNameEl) {
                const adminUser = JSON.parse(localStorage.getItem("cortero_user") || "{}");
                adminNameEl.textContent = adminUser.name || "Admin";
            }
        } else {
            const cName = a.full_name || u.name || "Cliente";

            if (DOM.clientName) DOM.clientName.textContent = cName;
            if (DOM.clientEmail) DOM.clientEmail.textContent = u.email || "—";
            if (DOM.clientPhone) DOM.clientPhone.textContent = a.phone || u.phone || "—";


            const addressParts = [a.street, a.city, a.state, a.country, a.postal_code].filter(Boolean);
            if (DOM.shippingAddress) {
                DOM.shippingAddress.innerHTML = addressParts.join(", ") || "—";
            }
        }

        // 3. Productos (Items) — summary style
        DOM.itemsBody.innerHTML = "";
        let subtotalFloat = 0;
        const shippingFloat = 60;
        let discountFloat = 0;

        if (o.items && o.items.length > 0) {
            o.items.forEach(item => {
                const prod = item.products || {};
                const name = prod.name || "Producto General";
                const lineTotal = item.quantity * item.price;
                subtotalFloat += lineTotal;

                const imgUrl = prod.image_url
                    ? (prod.image_url.startsWith("http") ? prod.image_url : `https://${prod.image_url}`)
                    : null;

                const div = document.createElement("div");
                div.className = "summary-item";
                div.innerHTML = `
                    ${imgUrl ? `<img src="${imgUrl}" alt="${name}" class="item-img">` : `<div class="item-img-placeholder"><span class="material-symbols-outlined">coffee</span></div>`}
                    <div class="item-info">
                        <div class="item-name">${name}</div>
                        <div class="item-details">Cant: ${item.quantity}</div>
                    </div>
                    <span class="item-price">L ${lineTotal.toFixed(2)}</span>
                `;
                DOM.itemsBody.appendChild(div);
            });
        } else {
            DOM.itemsBody.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:14px">No hay productos en este pedido.</div>`;
        }

        // 4. Pago y Totales
        const shippingTotal = subtotalFloat >= 150 ? 0 : shippingFloat;
        const discountVal = subtotalFloat - parseFloat(o.total || subtotalFloat);
        discountFloat = discountVal > 0 ? discountVal : 0;

        const subtotalEl = document.getElementById("detail-subtotal");
        const shippingEl = document.getElementById("detail-shipping");
        const discountEl = document.getElementById("detail-discount");
        const discountRow = document.getElementById("discount-row");

        if (subtotalEl) subtotalEl.textContent = `L ${subtotalFloat.toFixed(2)}`;
        if (shippingEl) shippingEl.textContent = shippingTotal === 0 ? "Gratis" : `L ${shippingTotal.toFixed(2)}`;
        if (discountFloat > 0 && discountEl) {
            discountRow.style.display = "flex";
            discountEl.textContent = `- L ${discountFloat.toFixed(2)}`;
        } else if (discountRow) {
            discountRow.style.display = "none";
        }

        if (DOM.paymentMethod) {
            DOM.paymentMethod.textContent = o.payment_method === "cash_on_delivery" || o.payment_method === "cash"
                ? "Pago en mano" : "Transferencia";
        }
        if (DOM.paymentDate) {
            DOM.paymentDate.textContent = `${new Date(o.created_at).toLocaleDateString("es-HN", {
                day: '2-digit', month: 'short', year: 'numeric'
            })} · ${new Date(o.created_at).toLocaleTimeString("es-HN", {
                hour: '2-digit', minute: '2-digit'
            })}`;
        }
        if (DOM.total) {
            DOM.total.textContent = `L ${parseFloat(o.total || subtotalFloat).toFixed(2)}`;
        }

        // Receipt link
        if (isPOS || o.payment_method === "Contra Entrega" || !o.receipt || o.receipt.length === 0) {
            if (DOM.receiptContainer) DOM.receiptContainer.classList.add("hidden");
        } else {
            if (DOM.receiptContainer) DOM.receiptContainer.classList.remove("hidden");
            if (DOM.paymentReceiptLink) DOM.paymentReceiptLink.href = o.receipt[0].file_url;
        }

        // 5. Order Notes
        if (DOM.orderNotes) {
            if (o.order_notes) {
                DOM.orderNotes.textContent = o.order_notes;
                DOM.orderNotes.style.opacity = "1";
            } else {
                DOM.orderNotes.textContent = 'El cliente no dejó notas.';
                DOM.orderNotes.style.opacity = "0.7";
            }
        }



        // Timeline & Action Buttons
        renderTimeline(o.status);
        renderActionButtons(o);
    }

    /* =========================
       TIMELINE (mis-pedidos style)
    ========================= */
    function renderTimeline(status) {
        if (isPOS) {
            const container = document.querySelector(".timeline-container-stitch");
            if (container) container.style.display = "none";
            return;
        }

        // Reset all steps
        document.querySelectorAll(".timeline-steps-stitch .step").forEach(s => {
            s.classList.remove("active", "completed");
        });

        const progressBar = DOM.timelineProgress;
        if (!progressBar) return;

        const flow = ["pending", "processing", "shipped", "delivered"];
        const currentIndex = flow.indexOf(status);
        let progressPercent = 0;

        if (status === "cancelled") {
            progressBar.style.width = "0%";
            progressBar.style.backgroundColor = "#ba1a1a";
            document.querySelector(".step-pending")?.classList.add("active");
            const icon = document.querySelector(".step-pending .step-custom-icon");
            if (icon) icon.src = "/imagenes/cancelado.png"; // fallback: keep original
            return;
        }

        if (currentIndex >= 0) {
            if (currentIndex === 0) progressPercent = 0;
            if (currentIndex === 1) progressPercent = 50;
            if (currentIndex === 2) progressPercent = 75;
            if (currentIndex === 3) progressPercent = 100;

            progressBar.style.width = `${progressPercent}%`;
            progressBar.style.backgroundColor = "";

            const steps = document.querySelectorAll(".timeline-steps-stitch .step");
            steps.forEach((step, i) => {
                if (i <= currentIndex) step.classList.add("active");
            });
        }
    }

    /* =========================
       ACTION BUTTONS
    ========================= */
    function renderActionButtons(o) {
        // No status actions on this page
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
       UPDATE STATUS
    ========================= */
    async function updateStatus(orderId, newStatus) {
        DOM.statusActionsBox.innerHTML = "Actualizando...";

        const { error } = await sb
            .from("orders")
            .update({ status: newStatus })
            .eq("id", orderId);

        if (error) {
            console.error("❌ Error actualizando estado:", error);
            openSnackbar("Error", "Error al actualizar el estado", null, false);
            renderActionButtons(orderData);
            return;
        }

        if (orderData.user_id) {
            await sendNotification(orderData.user_id, newStatus, orderData);
        }

        openSnackbar("¡Éxito!", "Estado actualizado correctamente.", null, false);
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
