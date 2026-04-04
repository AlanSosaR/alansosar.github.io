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

        // Guardar como PDF llama a Print nativo
        const btnPdf = document.getElementById("btn-pdf");
        if (btnPdf) {
            btnPdf.addEventListener("click", () => {
                window.print();
            });
        }

        // Compartir nativo en móviles o copia al portapapeles
        const btnShare = document.getElementById("btn-share");
        if (btnShare) {
            btnShare.addEventListener("click", () => {
                if (navigator.share) {
                    navigator.share({
                        title: `Factura Café Cortero - Orden #${order.order_number}`,
                        text: `Factura digital por pedido de Café Cortero. Orden #${order.order_number}`,
                        url: window.location.href,
                    }).catch(err => console.log('Error al compartir', err));
                } else {
                    alert("Compartir no está soportado en este navegador de escritorio. Puedes copiar el enlace de esta página.");
                }
            });
        }

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

    // Número de factura real simulado a formato SAR
    const orderNumPadded = o.order_number?.toString().padStart(8,"0") || "00000000";
    const docNum = `6549864654-${orderNumPadded}`;
    const fOrderNumber = document.getElementById("f-order-number");
    if (fOrderNumber) fOrderNumber.textContent = docNum;
    
    // Cliente
    const clientName = o.address?.full_name || o.users?.name || "Consumidor final";
    const fCustomerName = document.getElementById("f-customer-name");
    if (fCustomerName) fCustomerName.textContent = clientName;

    // Email
    const fCustomerEmail = document.getElementById("f-customer-email");
    if (fCustomerEmail) fCustomerEmail.textContent = o.users?.email || "—";

    // Teléfono
    const fCustomerPhone = document.getElementById("f-customer-phone");
    if (fCustomerPhone) fCustomerPhone.textContent = o.address?.phone || o.users?.phone || "—";

    // Dirección de envío
    const fCustomerAddress = document.getElementById("f-customer-address");
    if (fCustomerAddress) {
        if (o.address) {
            const parts = [
                o.address.street || o.address.address_line1 || "",
                o.address.city || "",
                o.address.state || "",
                o.address.country || "",
            ].filter(Boolean);
            fCustomerAddress.innerHTML = `<strong style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Dirección de envío</strong><br>${parts.join(', ')}`;
        } else {
            fCustomerAddress.textContent = "Recogida local / Sin dirección";
        }
    }

    // Detalles
    const fOrderDate = document.getElementById("f-order-date");
    if (fOrderDate) fOrderDate.textContent = formatDate(o.created_at);
    
    // Eliminamos el comportamiento antiguo de cambiar la UI si era pendiente
    // El Invoice fiscal siempre mostrará "Documento Válido" salvo que sea cancelada

    if (o.status === "cancelled") {
        const payTitle = document.getElementById("f-pay-title");
        const payIcon = document.getElementById("f-pay-icon");
        if(payTitle) {
            payTitle.textContent = "Anulado";
            payTitle.style.color = "#C62828";
        }
        if(payIcon) {
            payIcon.innerHTML = `<span class="material-symbols-outlined" style="font-size: 32px; color: #C62828;">cancel</span>`;
            payIcon.style.borderColor = "#C62828";
        }
    }

    // Tabla de Productos
    const tbody = document.getElementById("f-items-tbody");
    if (tbody) {
        tbody.innerHTML = "";
        
        let subtotal = 0;
        
        if (o.items && o.items.length > 0) {
            o.items.forEach((item) => {
                const product = item.products || {};
                const lineTotal = item.price * item.quantity;
                subtotal += lineTotal;
                
                const pName = product.name || "Producto Removido";
                const pPres = product.presentation || "Unidad";
                const pGrind = product.grind_type ? `• ${product.grind_type}` : "";
                
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td class="left">
                        <p class="item-name">${pName}</p>
                        <p class="item-desc">${pPres} ${pGrind}</p>
                    </td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.price)}</td>
                    <td>L 0.00</td>
                    <td>0.00%</td>
                    <td class="right">${formatCurrency(lineTotal)}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="center">No hay productos en este pedido</td></tr>`;
        }

        // Costos
        const fSubtotal = document.getElementById("f-subtotal");
        if(fSubtotal) fSubtotal.textContent = formatCurrency(subtotal);

        // Envío mockup
        const baseEnvio = (o.total && o.total > subtotal) ? (o.total - subtotal) : 0;
        const fEnvio = document.getElementById("f-envio");
        if (fEnvio) fEnvio.textContent = formatCurrency(baseEnvio);

        // Gravamiento ficticio al 15% (Mock, si es café usualmente es exento, pero el repo dice Gravado 15%)
        const fGravado = document.getElementById("f-gravado");
        if(fGravado) fGravado.textContent = formatCurrency(subtotal);
        
        const fIsv = document.getElementById("f-isv");
        const totalTax = subtotal * 0.15;
        if(fIsv) fIsv.textContent = formatCurrency(totalTax); // Factura real sumaría tax, pero aquí mock

        const mTotal = o.total || subtotal;
        const fTotal = document.getElementById("f-total");
        if(fTotal) fTotal.textContent = formatCurrency(mTotal);

        const fLetras = document.getElementById("f-letras");
        if(fLetras) fLetras.textContent = `VALOR DE ${formatCurrency(mTotal)} EN LEMPIRAS (GENERADO DIGITALMENTE)`;
    }

    // Auto imprimir tras carga de fuentes (700ms)
    setTimeout(() => {
        window.print();
    }, 700);
}
