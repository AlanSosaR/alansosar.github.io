document.addEventListener("DOMContentLoaded", () => {
    // Cargar datos del pedido almacenados
    const dataStr = sessionStorage.getItem("printOrderData");
    if (!dataStr) {
        alert("No se encontraron datos de la factura.");
        return;
    }

    try {
        const order = JSON.parse(dataStr);
        hydrateInvoice(order);
        
        // Listener del botón
        document.getElementById("btn-print")?.addEventListener("click", () => {
            window.print();
        });

    } catch(err) {
        console.error("Error procesando datos del pedido:", err);
    }
});

function hydrateInvoice(o) {
    const formatCurrency = (val) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(val);
    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        return d.toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const STATUS_MAP = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmado',
        'preparing': 'En Preparación',
        'shipped': 'Enviado',
        'delivered': 'Entregado',
        'cancelled': 'Anulado'
    };

    document.getElementById("f-order-num").textContent = `#${o.order_number?.toString().padStart(4,"0")}`;
    
    // Cliente
    const clientName = o.address?.full_name || o.users?.name || "Desconocido";
    document.getElementById("f-customer-name").textContent = clientName;
    document.getElementById("f-customer-email").textContent = o.users?.email || "—";
    document.getElementById("f-customer-phone").textContent = o.address?.phone || "—";
    
    let addressStr = "—";
    if (o.address) {
        const addrSt = o.address.street || o.address.address_line1 || "";
        const addrCity = `${o.address.city || ""}, ${o.address.state || ""}`;
        addressStr = `${addrSt ? addrSt + '\n' : ''}${addrCity}`;
    }
    document.getElementById("f-customer-address").innerHTML = addressStr.replace(/\n/g, "<br>") || "Recogida Local / Sin Dirección";

    // Detalles
    document.getElementById("f-order-date").textContent = formatDate(o.created_at);
    document.getElementById("f-order-status").textContent = STATUS_MAP[o.status] || o.status;
    
    // Traducción de métodos
    const PAYMENT_MAP = {
        'cash': 'Efectivo',
        'transfer': 'Transferencia',
        'cash_on_delivery': 'Contra entrega'
    };
    document.getElementById("f-payment-method").textContent = PAYMENT_MAP[o.payment_method] || o.payment_method || "—";
    
    // Lógica para mostrar la Tarjeta de Estado de Pago (Nuevo Diseño)
    const paymentCard = document.getElementById("f-payment-card");
    const isPaid = (o.status !== 'pending' && o.status !== 'cancelled');
    
    if (paymentCard) {
        if (o.status === "cancelled") {
            paymentCard.style.display = "none";
        } else {
            paymentCard.style.display = "flex";
            const payIcon = document.getElementById("f-pay-icon");
            const payTitle = document.getElementById("f-pay-title");
            const paySubtitle = document.getElementById("f-pay-subtitle");
            
            if (isPaid) {
                paymentCard.classList.remove("pending");
                payIcon.innerHTML = `<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1; font-size: 32px;">verified</span>`;
                payTitle.textContent = "Pago Confirmado";
                const transId = o.id ? `${o.id.substring(0, 4)}-${o.id.substring(4, 8)}-XX`.toUpperCase() : "N/A";
                paySubtitle.textContent = `Transacción ID: ${transId}`;
            } else {
                // Pendiente
                paymentCard.classList.add("pending");
                payIcon.innerHTML = `<span class="material-symbols-outlined" style="font-size: 28px;">hourglass_empty</span>`;
                payTitle.textContent = "Pago Pendiente";
                paySubtitle.textContent = "A la espera de confirmación";
            }
        }
    }

    // Tabla de Productos
    const tbody = document.getElementById("f-items-tbody");
    tbody.innerHTML = "";
    
    let subtotal = 0;
    
    if (o.items && o.items.length > 0) {
        o.items.forEach((item, index) => {
            const product = item.products || {};
            const lineTotal = item.price * item.quantity;
            subtotal += lineTotal;
            
            const pName = product.name || "Producto Removido";
            const pPres = product.presentation || "Unidad";
            const pGrind = product.grind_type ? `| ${product.grind_type}` : "";
            
            const tr = document.createElement("tr");
            tr.className = index % 2 === 0 ? "alt" : "";
            tr.innerHTML = `
                <td>
                    <p class="item-name primary">${pName}</p>
                    <p class="item-desc">${pPres} ${pGrind}</p>
                </td>
                <td class="center">x${item.quantity}</td>
                <td class="right">${formatCurrency(item.price)}</td>
                <td class="right total">${formatCurrency(lineTotal)}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="4" class="center">No hay productos en este pedido</td></tr>`;
    }

    // Costos
    document.getElementById("f-subtotal").textContent = formatCurrency(subtotal);
    // Como backend solo retorna el Total y no existe desglose real en BD, mostramos lo cobrado
    document.getElementById("f-total").textContent = formatCurrency(o.total || subtotal);

    // Auto imprimir tras carga de fuentes (700ms)
    setTimeout(() => {
        window.print();
    }, 700);
}
