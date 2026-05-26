/* ============================================================
   ADMIN — PEDIDOS | CAFÉ CORTERO
   STITCH LOGIC (MAESTRO-DETALLE)
============================================================ */

console.log("🛠️ admin_pedidos.js — INIT STITCH");

(() => {
    const sb = window.supabaseClient;
    if (!sb) throw new Error("❌ Supabase no inicializado");

    let orders = [];
    let filtered = [];
    let selectedOrder = null;
    let currentPage = 1;
    const itemsPerPage = 5;
    let currentStatus = "pending";
    let searchFilter = "";

    // CONFIG DE ESTADOS (Sync con DB y UI)
    const STATUS_MAP = {
        'pending': { label: 'PENDIENTE', color: '#9E9E9E', icon: 'inventory_2' }, // Gris oficial
        'preparing': { label: 'PREPARANDO', color: '#F9A825', icon: 'mop' },      // Naranja oficial
        'shipped': { label: 'EN CAMINO', color: '#19227D', icon: 'local_shipping' }, // Azul oscuro
        'delivered': { label: 'ENTREGADO', color: '#2E7D32', icon: 'verified' },     // Verde oficial
        'cancelled': { label: 'ANULADO', color: '#C62828', icon: 'cancel' }          // Rojo oficial
    };

    /* =========================
       INIT
    ========================= */
    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
        if (!user || user.rol !== "admin") return;

        bindGlobalEvents();
        bindDetailActions();

        await loadOrders();
    }

    /* =========================
       EVENTS
    ========================= */
    function bindGlobalEvents() {
        // Escuchar eventos del header search/filter (inyectados por layout.js)
        document.addEventListener("order:filter", async (e) => {
            currentStatus = e.detail;
            renderList();
        });

        document.addEventListener("order:search", (e) => {
            searchFilter = e.detail.toLowerCase();
            renderList();
        });

        // Paginación (Funcional)
        document.getElementById("list-prev")?.addEventListener("click", () => changePage(-1));
        document.getElementById("list-next")?.addEventListener("click", () => changePage(1));
    }

    function changePage(delta) {
        const totalPages = Math.ceil(filtered.length / itemsPerPage);
        const newPage = currentPage + delta;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            renderList(false); // No resetear selección al cambiar de página
        }
    }

    function bindDetailActions() {
        // Imprimir Factura
        document.getElementById("btnPrint")?.addEventListener("click", () => {
            if (!selectedOrder) return;
            sessionStorage.setItem("printOrderData", JSON.stringify(selectedOrder));
            window.open("/pages/admin/admin-factura-impresion.html", "_blank");
        });

        // Contactar Modal
        document.getElementById("btnContact")?.addEventListener("click", openContactModal);
        document.getElementById("btn-contact-order")?.addEventListener("click", openContactModal);
        document.getElementById("close-contact-modal")?.addEventListener("click", closeContactModal);
        document.getElementById("close-push-modal")?.addEventListener("click", closePushModal);
        document.getElementById("cancel-push")?.addEventListener("click", closePushModal);

        // Opciones de Contacto
        document.getElementById("opt-whatsapp")?.addEventListener("click", openWhatsAppModal);
        document.getElementById("opt-email")?.addEventListener("click", () => handleContactAction("email"));
        document.getElementById("opt-push")?.addEventListener("click", openPushModal);

        // Envío de Push
        document.getElementById("send-push")?.addEventListener("click", handleSendPush);

        // Envío de WhatsApp
        document.getElementById("send-whatsapp")?.addEventListener("click", handleSendWhatsApp);
        document.getElementById("close-whatsapp-modal")?.addEventListener("click", closeWhatsAppModal);
        document.getElementById("cancel-whatsapp")?.addEventListener("click", closeWhatsAppModal);

        // Volver (Mobile)
        document.getElementById("btn-back-to-list")?.addEventListener("click", backToList);

        // Botones de cambio de estado en el footer
        document.querySelectorAll(".status-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                // currentTarget siempre es el botón con data-status,
                // aunque el clic venga de un texto o icono interno
                const newStatus = e.currentTarget.dataset.status;
                if (selectedOrder && newStatus) {
                    confirmStatusChange(newStatus);
                }
            });
        });
    }

    /* =========================
       CONTACT MODAL LOGIC
    ========================= */
    function openContactModal() {
        if (!selectedOrder) return;
        const name = selectedOrder.users?.name || selectedOrder.address?.full_name || "Cliente";
        const modal = document.getElementById("modal-contact");
        const nameSpan = document.getElementById("contact-user-name");
        
        if (nameSpan) nameSpan.textContent = name;
        
        modal.classList.remove("hidden");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add("active");
            });
        });
    }

    function closeContactModal() {
        const modal = document.getElementById("modal-contact");
        modal.classList.remove("active");
        setTimeout(() => modal.classList.add("hidden"), 300);
    }

    function openPushModal() {
        closeContactModal();
        const modal = document.getElementById("modal-push");
        modal.classList.remove("hidden");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add("active");
            });
        });
    }

    function closePushModal() {
        const modal = document.getElementById("modal-push");
        modal.classList.remove("active");
        setTimeout(() => modal.classList.add("hidden"), 300);
    }

    function handleContactAction(type) {
        if (!selectedOrder) return;
        const email = selectedOrder.users?.email || "";

        if (type === "email") {
            if (!email) return showSnack("error", "No hay email registrado");
            window.location.href = `mailto:${email}`;
        }
        closeContactModal();
    }

    /* =========================
       WHATSAPP MODAL LOGIC
    ========================= */
    function openWhatsAppModal() {
        if (!selectedOrder) return;
        const phone = selectedOrder.address?.phone || "";
        if (!phone) return showSnack("error", "No hay teléfono registrado");

        const name = selectedOrder.users?.name || selectedOrder.address?.full_name || "Cliente";
        document.getElementById("whatsapp-user-name").textContent = name;
        document.getElementById("whatsapp-user-phone").textContent = phone;
        document.getElementById("whatsapp-message").value = "";

        closeContactModal();
        const modal = document.getElementById("modal-whatsapp");
        modal.classList.remove("hidden");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add("active");
                document.getElementById("whatsapp-message").focus();
            });
        });
    }

    function closeWhatsAppModal() {
        const modal = document.getElementById("modal-whatsapp");
        modal.classList.remove("active");
        setTimeout(() => modal.classList.add("hidden"), 300);
    }

    async function handleSendWhatsApp() {
        if (!selectedOrder) return;
        const phone = selectedOrder.address?.phone || "";
        const message = document.getElementById("whatsapp-message").value.trim();
        if (!message) return showSnack("error", "Escribe un mensaje");

        try {
            const cleanPhone = phone.replace(/\D/g, "");
            const hasCountryCode = phone.trim().startsWith("+");
            const fullNumber = hasCountryCode ? cleanPhone : `504${cleanPhone}`;
            const waApi = "https://cafe-cortero.vercel.app/api/wa-proxy";
            const waKey = "429683C4C977415CAAFCCE10F7D57E11";

            const res = await fetch(`${waApi}/message/sendText/CafeCortero`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: waKey },
                body: JSON.stringify({ number: fullNumber, text: message })
            });

            if (!res.ok) throw new Error("HTTP " + res.status);

            showSnack("success", "WhatsApp enviado");
            closeWhatsAppModal();
        } catch (err) {
            console.error("❌ Error al enviar WhatsApp:", err);
            showSnack("error", "Error al enviar WhatsApp");
        }
    }

    async function handleSendPush() {
        if (!selectedOrder || !selectedOrder.user_id) {
            showSnack("error", "Usuario no identificado");
            return;
        }

        const title = document.getElementById("push-title").value.trim();
        const message = document.getElementById("push-message").value.trim();

        if (!title || !message) {
            showSnack("error", "Título y mensaje requeridos");
            return;
        }

        try {
            const { error } = await sb.from("notifications").insert({
                user_id: selectedOrder.user_id,
                title,
                message,
                type: "admin_alert",
                is_read: false,
                metadata: { order_id: selectedOrder.id }
            });

            if (error) throw error;

            showSnack("success", "Notificación enviada");
            closePushModal();
            // Limpiar campos
            document.getElementById("push-title").value = "";
            document.getElementById("push-message").value = "";
            
        } catch (err) {
            showSnack("error", "Error al enviar notificación");
        }
    }

    /* =========================
       LOAD DATA
    ========================= */
    async function loadOrders() {
        const container = document.getElementById("orders-list");
        if (container) container.innerHTML = '<div class="loading-state">Cargando...</div>';

        try {
            const { data, error } = await sb
                .from("orders")
                .select(`
                    *,
                    users ( name, email ),
                    address:addresses ( * ),
                    items:order_items ( *, products ( * ) ),
                    receipt:payment_receipts ( * )
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;

            orders = data || [];
            renderList();

            // Auto-seleccionar el primero si no hay selección (SOLO EN DESKTOP)
            if (filtered.length > 0 && !selectedOrder && window.innerWidth > 768) {
                selectOrder(filtered[0]);
            }

        } catch (err) {
            console.error("Error cargando pedidos:", err);
            showSnack("error", "Error al cargar pedidos");
        }
    }

    /* =========================
       RENDER LIST (SIDEBAR)
    ========================= */
    function renderList(resetPage = true) {
        const container = document.getElementById("orders-list");
        const countBadge = document.getElementById("orders-count-stitch");
        const tpl = document.getElementById("tpl-order-card");
        const pageInfo = document.getElementById("list-page-numbers");
        
        if (!container || !tpl) return;
        if (resetPage) currentPage = 1;

        // Filtrar localmente
        filtered = orders.filter(o => {
            const matchStatus = currentStatus === "all" || o.status === currentStatus;
            const matchSearch = !searchFilter || 
                String(o.order_number).includes(searchFilter) || 
                (o.users?.name || "").toLowerCase().includes(searchFilter) ||
                (o.address?.full_name || "").toLowerCase().includes(searchFilter);
            return matchStatus && matchSearch;
        });

        if (countBadge) countBadge.textContent = filtered.length;

        // PAGINACIÓN (Límite 5 solicitado)
        const totalPages = Math.ceil(filtered.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const pageItems = filtered.slice(start, start + itemsPerPage);

        if (pageInfo) {
            pageInfo.textContent = filtered.length > 0 ? `Pág. ${currentPage} / ${totalPages || 1}` : "0 / 0";
        }

        container.innerHTML = "";

        if (pageItems.length === 0) {
            container.innerHTML = '<div class="loading-state">No hay pedidos</div>';
            if (resetPage) showNoSelection();
            return;
        }

        pageItems.forEach(o => {
            const clone = tpl.content.cloneNode(true);
            const card = clone.querySelector(".order-card-item-stitch");
            
            card.querySelector(".card-order-number").textContent = `Pedido #${o.order_number}`;
            card.querySelector(".card-user-name").textContent = o.users?.name || o.address?.full_name || "Cliente";
            card.querySelector(".card-date").textContent = new Date(o.created_at).toLocaleDateString();
            card.querySelector(".card-total").textContent = `L ${Number(o.total).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
            
            const statusLabel = card.querySelector(".card-status-label");
            const statusConfig = STATUS_MAP[o.status] || STATUS_MAP.pending;
            statusLabel.textContent = statusConfig.label;
            statusLabel.style.color = statusConfig.color;

            const dot = card.querySelector(".card-status-dot");
            dot.style.backgroundColor = statusConfig.color;

            if (selectedOrder && selectedOrder.id === o.id) {
                card.classList.add("active");
            }

            card.onclick = () => selectOrder(o);
            container.appendChild(clone);
        });
    }

    /* =========================
       SELECT & RENDER DETAIL
    ========================= */
    function selectOrder(order) {
        selectedOrder = order;
        
        // Marcar activo en mobile
        document.body.classList.add("detail-view-active");

        // UI de lista
        document.querySelectorAll(".order-card-item-stitch").forEach(c => c.classList.remove("active"));
        renderList(false); // No resetear página

        // Mostrar panel
        document.getElementById("order-detail").classList.remove("hidden");
        document.getElementById("order-detail-content").classList.remove("hidden");
        document.getElementById("no-selection").classList.add("hidden");

        renderDetail(order);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function backToList() {
        document.body.classList.remove("detail-view-active");
        selectedOrder = null;
    }

    function renderDetail(o) {
        // Cabecera
        document.getElementById("order-id-display").textContent = `Pedido #${o.order_number}`;
        const badge = document.getElementById("order-status-badge");
        const config = STATUS_MAP[o.status] || STATUS_MAP.pending;
        badge.textContent = config.label;
        badge.style.backgroundColor = config.color;

        // Timeline
        updateTimeline(o.status);

        // Cliente
        document.getElementById("o-client-name").textContent = o.users?.name || o.address?.full_name || "—";
        document.getElementById("o-email").textContent = o.users?.email || "—";
        document.getElementById("o-phone").textContent = o.address?.phone || "—";
        const addr = o.address;
        document.getElementById("o-address").textContent = addr ? `${addr.street}, ${addr.city}, ${addr.state}` : "—";

        // Pago
        document.getElementById("p-method").textContent = (o.payment_method || "No especificado").toUpperCase();
        document.getElementById("p-date").textContent = new Date(o.created_at).toLocaleString();
        document.getElementById("p-total").textContent = `L ${Number(o.total).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;

        // Comprobante
        const receiptBox = document.getElementById("receipt-container");
        if (o.receipt && o.receipt[0]) {
            receiptBox.classList.remove("hidden");
            document.getElementById("receipt-link").href = o.receipt[0].file_url;
        } else {
            receiptBox.classList.add("hidden");
        }

        // Productos
        const itemsList = document.getElementById("order-items-list");
        itemsList.innerHTML = o.items.map(item => `
            <div class="order-item-row">
                <img src="${item.products?.image_url || '/imagenes/placeholder-cafe.png'}" class="item-img" alt="Producto">
                <div class="item-info">
                    <div class="item-info-top">
                        <span>${item.products?.name || 'Producto'}</span>
                        <span>x${item.quantity}</span>
                    </div>
                    <div class="item-variant">${item.products?.presentation || ''} | ${item.products?.grind_type || ''}</div>
                </div>
                <div class="item-price">L ${(item.price * item.quantity).toLocaleString()}</div>
            </div>
        `).join('');

        // Footer Buttons active state & Visibility conditional
        const btnPending = document.getElementById("btn-st-pending");
        const btnPreparing = document.getElementById("btn-st-preparing");
        const btnShipped = document.getElementById("btn-st-shipped");
        const btnDelivered = document.getElementById("btn-st-delivered");
        const btnCancelled = document.getElementById("btn-st-cancelled");

        // Ocultar todos por defecto
        [btnPending, btnPreparing, btnShipped, btnDelivered, btnCancelled].forEach(b => b?.classList.add("hidden"));

        if (o.status === "pending") {
            btnPreparing?.classList.remove("hidden");
            btnCancelled?.classList.remove("hidden");
        } else if (o.status === "preparing") {
            btnShipped?.classList.remove("hidden");
            btnCancelled?.classList.remove("hidden");
        } else if (o.status === "shipped") {
            btnDelivered?.classList.remove("hidden");
            btnCancelled?.classList.remove("hidden");
        } else if (o.status === "cancelled") {
            btnPending?.classList.remove("hidden"); // Opción de restaurar
        }

        document.querySelectorAll(".status-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.status === o.status);
        });
    }

    function updateTimeline(status) {
        const bar = document.getElementById("timeline-progress-bar");
        const steps = document.querySelectorAll(".timeline-steps-stitch .step");
        
        const levels = { 'pending': 0, 'preparing': 1, 'shipped': 2, 'delivered': 3, 'cancelled': -1 };
        const level = levels[status] ?? 0;

        if (level === -1) {
            bar.style.width = "0%";
            steps.forEach(s => s.classList.remove("active"));
        } else {
            bar.style.width = `${(level / 3) * 100}%`;
            steps.forEach((s, idx) => {
                s.classList.toggle("active", idx <= level);
            });
        }
    }

    /* =========================
       ACTIONS (DB)
    ========================= */

    async function confirmStatusChange(newStatus) {
        const label = (STATUS_MAP[newStatus]?.label || newStatus).toLowerCase();
        const ok = await showActionConfirm(`¿Cambiar pedido a <b>${label}</b>?`);
        if (ok) {
            performStatusUpdate(newStatus);
        }
    }

    /* =========================
       CONFIRMATION BOX LOGIC (FIXED)
    ========================= */
    /**
     * @function showActionConfirm
     * Implementación blindada para el snackbar de confirmación (Stitch Robust Protocol)
     */
    function showActionConfirm(text) {
        console.log("🎯 showActionConfirm: INIT");
        return new Promise((resolve) => {
            const snack = document.getElementById("confirm-snackbar");
            const label = document.getElementById("confirm-text");
            const btnOk = document.getElementById("btn-confirm-ok");
            const btnCancel = document.getElementById("btn-confirm-cancel");
            
            let isResolving = false; // Debounce flag

            if (!snack || !label || !btnOk || !btnCancel) {
                console.error("❌ Componentes del snackbar no encontrados");
                return resolve(false);
            }

            label.innerHTML = text;

            // Handler principal para resolver
            const handleFinish = (result) => {
                if (isResolving) return;
                isResolving = true;

                // Limpieza manual de listeners (Requisito estricto)
                btnOk.removeEventListener("click", onConfirm);
                btnCancel.removeEventListener("click", onCancel);

                console.log(`✅ Promise RESOLVIENDO CON ${result}`);
                
                // Ocultar y resolver
                snack.classList.remove("active");
                setTimeout(() => snack.classList.add("hidden"), 300);
                resolve(result);
            };

            const onConfirm = (e) => {
                e.preventDefault();
                console.log("✅ [btn-confirm-ok] CLIC DETECTADO");
                handleFinish(true);
            };

            const onCancel = (e) => {
                e.preventDefault();
                console.log("✅ [btn-confirm-cancel] CLIC DETECTADO");
                handleFinish(false);
            };

            // 1. Asignar listeners ANTES de mostrar
            btnOk.addEventListener("click", onConfirm);
            btnCancel.addEventListener("click", onCancel);

            // 2. Mostrar con máximo 1 RAF
            snack.classList.remove("hidden");
            requestAnimationFrame(() => {
                snack.classList.add("active");
                console.log("🎯 showActionConfirm: SNACKBAR VISIBLE Y LISTO");
            });
        });
    }

    async function performStatusUpdate(newStatus) {
        try {
            const { error } = await sb
                .from("orders")
                .update({ status: newStatus })
                .eq("id", selectedOrder.id);

            if (error) throw error;

            showSnack("success", "Estado actualizado");
            
            // Enviar notificación push
            await sendPushNotification(selectedOrder.user_id, newStatus, selectedOrder.order_number);
            // Enviar WhatsApp al cliente
            const customerPhone = selectedOrder.address?.phone || "";
            if (customerPhone && customerPhone.replace(/\D/g, "").length >= 10) {
                await sendWhatsAppNotification(customerPhone, newStatus, selectedOrder.order_number);
            }

            // Recargar datos
            await loadOrders();
            const updated = orders.find(x => x.id === selectedOrder.id);
            if (updated) selectOrder(updated);

        } catch (err) {
            showSnack("error", "Error al actualizar estado");
        }
    }

    async function sendWhatsAppNotification(phone, status, orderNum) {
        if (!phone) return;
        const msgs = {
            processing: "☕ *Café Cortero* — ¡Recibimos tu pedido #",
            preparing: "☕ *Café Cortero* — Estamos preparando tu pedido #",
            shipped: "🚢 *Café Cortero* — ¡Tu pedido #",
            delivered: "☕✨ *Café Cortero* — ¡Disfruta tu café! Pedido #",
            cancelled: "❌ *Café Cortero* — Tu pedido #"
        };
        const msgBase = msgs[status];
        if (!msgBase) return;

        const suffixes = {
            processing: "! Ya está siendo preparado con cuidado. Te avisaremos cuando esté listo.",
            preparing: "! Ya estamos en ello. Pronto estará listo.",
            shipped: " ya va en camino! Sigue el rastro para saber cuándo llegará.",
            delivered: " ha sido entregado. Esperamos que cada taza sea especial. ¡Vuelve pronto!",
            cancelled: " ha sido cancelado. Si tienes dudas, contáctanos."
        };

        try {
            const cleanPhone = phone.replace(/\D/g, "");
            const hasCountryCode = phone.trim().startsWith("+");
            const fullNumber = hasCountryCode ? cleanPhone : `504${cleanPhone}`;
            const waApi = "https://cafe-cortero.vercel.app/api/wa-proxy";
            const waKey = "429683C4C977415CAAFCCE10F7D57E11";

            await fetch(`${waApi}/message/sendText/CafeCortero`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: waKey },
                body: JSON.stringify({
                    number: fullNumber,
                    text: `${msgBase}${orderNum}${suffixes[status]}`
                })
            });
        } catch (err) {
            console.error("❌ Error al enviar WhatsApp:", err);
        }
    }

    async function sendPushNotification(userId, status, orderNum) {
        if (!userId) return;
        const msgs = {
            processing: "¡Hola! ☕ Recibimos tu pedido y confirmamos tu pago. Ya está siendo preparado con cuidado. Cuando esté listo para enviar, te notificaremos. ¡Gracias! Pedido #",
            preparing: "¡Hola! ☕ Recibimos tu pedido y confirmamos tu pago. Ya está siendo preparado con cuidado. Cuando esté listo para enviar, te notificaremos. ¡Gracias! Pedido #",
            shipped: "🚢 ¡Buenas noticias! Tu pedido ya va en camino. Sigue el rastro para saber cuándo disfrutarás de tu café. Pedido #",
            delivered: "☕✨ ¡Disfrútalo! Tu pedido ha sido entregado. Esperamos que cada taza sea especial. ¡Vuelve pronto! Pedido #",
            cancelled: "❌ Tu pedido ha sido cancelado. Si tienes dudas, contáctanos. Pedido #"
        };

        const msgBase = msgs[status];
        if (!msgBase) return;

        try {
            console.log("🚀 Notificando pedido #" + orderNum);
            
            const { error: insErr } = await sb
                .from("notifications")
                .insert([{
                    user_id: userId,
                    title: "☕ Café Cortero — ¡Pago Confirmado!",
                    message: `${msgBase}${orderNum}`,
                    type: "order_status",
                    is_read: false,
                    metadata: {
                        order_id: selectedOrder.id,
                        order_number: orderNum,
                        new_status: status
                    }
                }]);

            if (insErr) throw insErr;
            console.log("✅ Notificación grabada en DB. El disparador automático se encarga del resto.");
            
        } catch (err) {
            console.error("❌ Error al grabar notificación:", err);
        }
    }

    /* =========================
       UTILS
    ========================= */
    function showNoSelection() {
        document.getElementById("order-detail").classList.add("hidden");
        document.getElementById("no-selection").classList.remove("hidden");
    }

    function showSnack(type, text) {
        const snack = document.getElementById("admin-snackbar");
        const icon = document.getElementById("snack-icon");
        const label = document.getElementById("snack-text");
        
        label.textContent = text;
        icon.textContent = type === "success" ? "check_circle" : type === "error" ? "error" : "info";
        
        snack.classList.add("active");
        setTimeout(() => snack.classList.remove("active"), 3000);
    }

})();
