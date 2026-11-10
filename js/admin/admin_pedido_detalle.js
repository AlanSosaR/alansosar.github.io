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

    function resolveImgUrl(url) {
        if (!url) return "/imagenes/no-image.png";
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        return "https://" + url.replace(/^\/+/, "");
    }

    function numeroALetras(num) {
        const Unidades = (n) => {
            const u = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
            return u[n] || "";
        };
        const Decenas = (n) => {
            const d = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
            if (n < 10) return Unidades(n);
            if (n === 11) return "ONCE";
            if (n === 12) return "DOCE";
            if (n === 13) return "TRECE";
            if (n === 14) return "CATORCE";
            if (n === 15) return "QUINCE";
            if (n < 20) return "DIECI" + Unidades(n - 10);
            if (n === 20) return "VEINTE";
            if (n < 30) return "VEINTI" + Unidades(n - 20);
            const u = n % 10;
            return d[Math.floor(n / 10)] + (u > 0 ? " Y " + Unidades(u) : "");
        };
        const Centenas = (n) => {
            if (n === 100) return "CIEN";
            if (n < 100) return Decenas(n);
            const c = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
            const d = n % 100;
            return c[Math.floor(n / 100)] + (d > 0 ? " " + Decenas(d) : "");
        };
        const Miles = (n) => {
            if (n < 1000) return Centenas(n);
            const m = Math.floor(n / 1000);
            const r = n % 1000;
            const strM = m === 1 ? "MIL" : Centenas(m) + " MIL";
            return strM + (r > 0 ? " " + Centenas(r) : "");
        };

        const entero = Math.floor(num);
        const centavos = Math.round((num - entero) * 100);
        const letras = Miles(entero);
        const strCentavos = String(centavos).padStart(2, "0") + "/100 L.";
        return `${letras} LEMPIRAS CON ${strCentavos}`;
    }

    // DOM Elements
    const DOM = {
        orderNumber: document.getElementById("detail-order-number") || document.getElementById("detail-order-number-mobile"),
        orderNumberMobile: document.getElementById("detail-order-number-mobile"),
        statusBadge: document.getElementById("detail-status") || document.getElementById("detail-status-mobile"),
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

            // Normalizar comprobantes de pago
            if (!data.payment_receipts && data.receipt) {
                data.payment_receipts = data.receipt;
            }
            if (!data.payment_receipts || data.payment_receipts.length === 0) {
                try {
                    const { data: rcList } = await sb
                        .from("payment_receipts")
                        .select("file_url")
                        .eq("order_id", orderId);
                    if (rcList && rcList.length > 0) {
                        data.payment_receipts = rcList;
                        data.receipt = rcList;
                    }
                } catch (e) {}
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
        const customerRaw = u.name || a.full_name || "Consumidor final";
        const isVentaRapida = isPOS ||
                              customerRaw.toLowerCase().includes("venta rápida") ||
                              customerRaw.toLowerCase().includes("venta rapida");

        const headerTitleText = isVentaRapida ? "Detalle de la venta" : "Detalle del pedido";
        if (DOM.orderNumber) DOM.orderNumber.textContent = headerTitleText;
        if (DOM.orderNumberMobile) DOM.orderNumberMobile.textContent = headerTitleText;

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

        // ========================================================
        // RENDERIZADO DEL COMPROBANTE COMPLETO (OFICIAL RECIBO CAFÉ CORTERO)
        // ========================================================
        const adminUser = JSON.parse(localStorage.getItem("cortero_user") || "{}");
        const adminName = adminUser.name || "Administrador";

        // Document info
        const docTypeEl = document.getElementById("invoiceDocType");
        if (docTypeEl) docTypeEl.textContent = isVentaRapida ? "Venta" : "Pedido";

        const numPedidoEl = document.getElementById("numeroPedido");
        if (numPedidoEl) numPedidoEl.textContent = o.order_number || "—";

        // Client box
        const lblClienteEl = document.getElementById("lblCliente");
        if (lblClienteEl) lblClienteEl.textContent = isVentaRapida ? "PEDIDO POS" : "Cliente";

        const nombreClienteEl = document.getElementById("nombreCliente");
        if (nombreClienteEl) {
            nombreClienteEl.textContent = isVentaRapida ? "VENTA EN MOSTRADOR" : customerRaw;
        }

        const emailRow = document.getElementById("f-customer-email-row");
        const correoClienteEl = document.getElementById("correoCliente");
        if (emailRow && correoClienteEl) {
            if (!isVentaRapida && u.email && !u.email.includes("@pos.cafecortero.com")) {
                emailRow.classList.remove("hidden");
                emailRow.style.display = "flex";
                correoClienteEl.textContent = u.email;
            } else {
                emailRow.classList.add("hidden");
                emailRow.style.display = "none";
            }
        }

        const phoneRow = document.getElementById("f-customer-phone-row");
        const telefonoClienteEl = document.getElementById("telefonoCliente");
        if (phoneRow && telefonoClienteEl) {
            const phoneVal = a.phone || u.phone;
            if (!isVentaRapida && phoneVal) {
                phoneRow.classList.remove("hidden");
                phoneRow.style.display = "flex";
                telefonoClienteEl.textContent = phoneVal;
            } else {
                phoneRow.classList.add("hidden");
                phoneRow.style.display = "none";
            }
        }

        const direccionClienteEl = document.getElementById("direccionCliente");
        if (direccionClienteEl) {
            if (isVentaRapida) {
                direccionClienteEl.textContent = `POR: ${adminName}`;
            } else {
                const addrParts = [a.street, a.city, a.state, a.country].filter(Boolean);
                direccionClienteEl.textContent = addrParts.join(", ") || "Recogida local / Sin dirección";
            }
        }

        // Issue box
        const fechaPedidoEl = document.getElementById("fechaPedido");
        const horaPedidoEl = document.getElementById("horaPedido");
        if (fechaPedidoEl && o.created_at) {
            const d = new Date(o.created_at);
            fechaPedidoEl.textContent = d.toLocaleDateString("es-HN", {
                day: "2-digit", month: "2-digit", year: "numeric"
            });
            if (horaPedidoEl) {
                horaPedidoEl.textContent = d.toLocaleTimeString("es-HN", {
                    hour: "2-digit", minute: "2-digit"
                });
            }
        }

        const statusBlock = document.querySelector(".status-block");
        const payTitle = document.getElementById("f-pay-title");
        const paySub = document.getElementById("f-pay-subtitle");
        const payIcon = document.getElementById("f-pay-icon");

        if (isVentaRapida) {
            if (statusBlock) statusBlock.style.display = "none";
        } else {
            if (statusBlock) statusBlock.style.display = "";
            if (payTitle) payTitle.textContent = isPOS ? "Pedido POS" : "Pedido Web";
            if (paySub) paySub.textContent = isPOS ? "Venta en mostrador" : "Operación autorizada";
            if (payIcon) {
                payIcon.innerHTML = isPOS
                    ? '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">point_of_sale</span>'
                    : '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">verified</span>';
            }
        }

        // Table items
        const listaProdEl = document.getElementById("listaProductos");
        let subtotal = 0;
        if (listaProdEl) {
            if (o.items && o.items.length > 0) {
                listaProdEl.innerHTML = o.items.map(it => {
                    const prod = it.products || {};
                    const lineTotal = it.quantity * it.price;
                    subtotal += lineTotal;
                    const imgSrc = resolveImgUrl(prod.image_url);
                    const desc = [
                        prod.category,
                        prod.grind_type,
                        prod.presentation?.replace('1lb', '1 lb (454 g)')
                    ].filter(Boolean).join(' • ') || 'Café';

                    return `
                        <tr>
                            <td class="left col-prod">
                                <div class="prod-info-cell" style="display:flex;align-items:center;gap:12px;">
                                    <img src="${imgSrc}" alt="${prod.name || 'Café'}" style="width:60px;height:60px;object-fit:contain;flex-shrink:0;background:transparent;border:none;" onerror="this.onerror=null;this.src='/imagenes/no-image.png'">
                                    <div>
                                        <p class="item-name" style="margin:0;font-weight:700;color:var(--espresso,#2A170E);font-size:14px;">${prod.name || 'Café'}</p>
                                        <p class="item-desc" style="margin:2px 0 0 0;font-size:12px;color:var(--text-secondary,#715B51);">${desc}</p>
                                    </div>
                                </div>
                            </td>
                            <td class="col-qty" style="text-align:center;font-weight:600;"><span class="qty-prefix">Cant: </span>${it.quantity}</td>
                            <td class="right col-price" style="text-align:right;font-weight:700;color:var(--espresso,#2A170E);">L ${Number(it.price).toFixed(2)}</td>
                        </tr>
                    `;
                }).join("");
            } else {
                listaProdEl.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:24px;color:#888;">No hay productos registrados en este pedido.</td></tr>`;
            }
        }

        // Totales y Desglose
        const finalTotal = parseFloat(o.total || subtotal);
        const fGravado = document.getElementById("f-gravado");
        if (fGravado) fGravado.textContent = `L ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const fIsv = document.getElementById("f-isv");
        if (fIsv) fIsv.textContent = `L ${(subtotal * 0.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const fEnvio = document.getElementById("f-envio");
        if (fEnvio) {
            fEnvio.textContent = isPOS ? "L 0.00" : (subtotal >= 150 ? "Gratis" : "L 60.00");
        }

        const totalPedidoEl = document.getElementById("totalPedido");
        if (totalPedidoEl) {
            totalPedidoEl.textContent = finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        const fLetras = document.getElementById("f-letras");
        if (fLetras) fLetras.textContent = numeroALetras(finalTotal);

        // Descuento
        const totalDescuento = Number(o.discount || o.discount_amount || 0);
        const fDescuentoRow = document.getElementById("f-descuento-row");
        const fDescuento = document.getElementById("f-descuento");
        if (totalDescuento > 0 && fDescuentoRow && fDescuento) {
            fDescuentoRow.style.display = "flex";
            fDescuento.textContent = `-L ${totalDescuento.toFixed(2)}`;
        } else if (fDescuentoRow) {
            fDescuentoRow.style.display = "none";
        }

        // Método de pago y atendido por
        const metodoPagoTexto = document.getElementById("metodoPagoTexto");
        const atendidoPorTexto = document.getElementById("atendidoPorTexto");
        const notasOrdenTexto = document.getElementById("notasOrdenTexto");

        const isCash = o.payment_method === "cash_on_delivery" ||
                       o.payment_method === "cash" ||
                       o.payment_method === "Pago en mano" ||
                       o.payment_method === "Contra Entrega" ||
                       posPaymentMethod === "Efectivo";

        if (metodoPagoTexto) {
            metodoPagoTexto.textContent = isCash ? "Pago en efectivo / mano" : "Transferencia bancaria";
        }

        if (atendidoPorTexto) {
            if (isPOS) {
                atendidoPorTexto.style.display = "block";
                atendidoPorTexto.textContent = `Atendido por: ${adminName}`;
            } else {
                atendidoPorTexto.style.display = "none";
            }
        }

        if (notasOrdenTexto) {
            if (o.order_notes) {
                notasOrdenTexto.textContent = `Nota: ${o.order_notes}`;
                notasOrdenTexto.style.display = "block";
            } else {
                notasOrdenTexto.style.display = "none";
            }
        }

        // Comprobante adjunto (si el cliente subió imagen de depósito)
        const receiptList = Array.isArray(o.payment_receipts)
            ? o.payment_receipts
            : (Array.isArray(o.receipt) ? o.receipt : (o.receipt ? [o.receipt] : []));

        const preview = document.getElementById("previewComprobanteRecibo");
        const img = document.getElementById("imgComprobanteRecibo");
        const receiptLink = document.getElementById("payment-receipt-link");
        const hasReceiptFile = receiptList.length > 0 && Boolean(receiptList[0]?.file_url);

        if (preview && img) {
            if (hasReceiptFile && !isCash) {
                preview.classList.remove("hidden");
                preview.style.display = "block";
                img.style.display = "block";
                img.src = receiptList[0].file_url;
                img.onclick = () => window.open(receiptList[0].file_url, "_blank");
                if (receiptLink) receiptLink.href = receiptList[0].file_url;
            } else {
                preview.classList.add("hidden");
                preview.style.display = "none";
            }
        }



        // Timeline & Action Buttons
        renderTimeline(o.status, isVentaRapida);
        renderActionButtons(o);
    }

    /* =========================
       TIMELINE (mis-pedidos style)
    ========================= */
    function renderTimeline(status, isVentaRapida = false) {
        if (isPOS || isVentaRapida) {
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
