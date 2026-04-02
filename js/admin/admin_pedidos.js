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
    let currentStatus = "pending";
    let searchFilter = "";

    // CONFIG DE ESTADOS (Sync con DB y UI)
    const STATUS_MAP = {
        'pending': { label: 'PENDIENTE', color: '#FF9800', icon: 'inventory_2' },
        'preparing': { label: 'PREPARANDO', color: '#2196F3', icon: 'mop' },
        'shipped': { label: 'EN CAMINO', color: '#9C27B0', icon: 'local_shipping' },
        'delivered': { label: 'ENTREGADO', color: '#4CAF50', icon: 'verified' },
        'cancelled': { label: 'ANULADO', color: '#f44336', icon: 'cancel' }
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

        // Paginación (Mock por ahora para el Sidebar)
        document.getElementById("list-prev")?.addEventListener("click", () => showSnack("info", "Paginación próximamente"));
        document.getElementById("list-next")?.addEventListener("click", () => showSnack("info", "Paginación próximamente"));
    }

    function bindDetailActions() {
        // Guardar Notas
        document.getElementById("btnSaveNotes")?.addEventListener("click", saveAdminNotes);

        // Imprimir
        document.getElementById("btnPrint")?.addEventListener("click", () => window.print());

        // Botones de cambio de estado en el footer
        document.querySelectorAll(".status-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const newStatus = e.target.dataset.status;
                if (selectedOrder && newStatus) {
                    confirmStatusChange(newStatus);
                }
            });
        });
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

            // Auto-seleccionar el primero si no hay selección
            if (filtered.length > 0 && !selectedOrder) {
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
    function renderList() {
        const container = document.getElementById("orders-list");
        const countBadge = document.getElementById("orders-count-stitch");
        const tpl = document.getElementById("tpl-order-card");
        
        if (!container || !tpl) return;

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

        container.innerHTML = "";

        if (filtered.length === 0) {
            container.innerHTML = '<div class="loading-state">No hay pedidos</div>';
            showNoSelection();
            return;
        }

        filtered.forEach(o => {
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
        
        // UI de lista
        document.querySelectorAll(".order-card-item-stitch").forEach(c => c.classList.remove("active"));
        renderList(); // Refresh para marcar activo

        // Mostrar panel
        document.getElementById("order-detail").classList.remove("hidden");
        document.getElementById("no-selection").classList.add("hidden");

        renderDetail(order);
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

        // Notas Admin
        document.getElementById("o-admin-notes").value = o.order_notes || "";

        // Footer Buttons active state
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
    async function saveAdminNotes() {
        if (!selectedOrder) return;
        const notes = document.getElementById("o-admin-notes").value;
        const btn = document.getElementById("btnSaveNotes");
        const original = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.textContent = "Guardando...";

            const { error } = await sb
                .from("orders")
                .update({ order_notes: notes })
                .eq("id", selectedOrder.id);

            if (error) throw error;

            showSnack("success", "Nota interna guardada");
            selectedOrder.order_notes = notes;

        } catch (err) {
            showSnack("error", "Error al guardar nota");
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    function confirmStatusChange(newStatus) {
        const text = `¿Cambiar pedido a ${(STATUS_MAP[newStatus]?.label || newStatus).toLowerCase()}?`;
        if (confirm(text)) {
            performStatusUpdate(newStatus);
        }
    }

    async function performStatusUpdate(newStatus) {
        try {
            const { error } = await sb
                .from("orders")
                .update({ status: newStatus })
                .eq("id", selectedOrder.id);

            if (error) throw error;

            showSnack("success", "Estado actualizado");
            
            // Enviar notificación (Async)
            sendPushNotification(selectedOrder.user_id, newStatus, selectedOrder.order_number);

            // Recargar datos
            await loadOrders();
            const updated = orders.find(x => x.id === selectedOrder.id);
            if (updated) selectOrder(updated);

        } catch (err) {
            showSnack("error", "Error al actualizar estado");
        }
    }

    async function sendPushNotification(userId, status, orderNum) {
        if (!userId) return;
        const msgs = {
            preparing: "Estamos preparando tu pedido #",
            shipped: "Tu pedido está en camino #",
            delivered: "¡Pedido entregado! Gracias #",
            cancelled: "Tu pedido ha sido cancelado #"
        };

        const msg = msgs[status];
        if (!msg) return;

        await sb.from("notifications").insert({
            user_id: userId,
            title: "Actualización de Pedido",
            message: `${msg}${orderNum}`,
            type: "status",
            is_read: false
        });
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
