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
    document.getElementById("f-payment-method").textContent = o.payment_method === 'transfer' ? 'Transferencia' : (o.payment_method === 'cash' ? 'Efectivo' : o.payment_method || "—");
    
    // Autogenerar una guía falsa con el UUID del pedido para trackeo
    document.getElementById("f-order-guid").textContent = o.id ? `CC-${o.id.substring(0,8).toUpperCase()}` : "—";
    
    const isPaid = (o.status !== 'pending' && o.status !== 'cancelled');
    if (!isPaid) {
        const pg = document.getElementById("f-payment-group");
        if(pg) {
            pg.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="h-12 w-12 rounded-full border-2 border-stone-300 flex items-center justify-center">
                        <span class="material-symbols-outlined text-stone-300">hourglass_empty</span>
                    </div>
                    <div>
                        <p class="text-espresso font-bold leading-none">Pago Pendiente</p>
                        <p class="text-espresso/60 text-xs mt-1">A la espera de confirmación</p>
                    </div>
                </div>
            `;
        }
    } else {
        const pgId = document.getElementById("f-transaction-id");
        if(pgId) pgId.textContent = `Aprobado - ID: ${o.id.substring(8, 16).toUpperCase()}`;
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
                    <p class="item-name ${index % 2 === 0 ? 'primary' : ''}">${pName}</p>
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
    // El "total" en DB contiene ya el subtotal + envio, asi que solo mostramos el total de la DB y asumimos envío como 0 o diferencia
    const envio = parseFloat(o.total || subtotal) - subtotal;
    // Si la DB maneja shipping exacto lo mostraríamos
    
    document.getElementById("f-total").textContent = formatCurrency(o.total || subtotal);

    // Auto imprimir tras carga de fuentes (700ms)
    setTimeout(() => {
        window.print();
    }, 700);
}
