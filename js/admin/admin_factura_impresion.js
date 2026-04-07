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
        
        // Menú 3 puntos (móvil)
        const dotsBtn = document.getElementById("menu-dots-btn");
        const dotsDropdown = document.getElementById("dots-dropdown");
        if (dotsBtn && dotsDropdown) {
            dotsBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                dotsDropdown.classList.toggle("open");
            });
            document.addEventListener("click", () => {
                dotsDropdown.classList.remove("open");
            });
        }

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

    // Número de orden real
    const fOrderNumber = document.getElementById("f-order-number");
    if (fOrderNumber) fOrderNumber.textContent = o.order_number || "—";
    
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
        if(fLetras) {
            const totalEnLetras = numeroALetras(mTotal);
            fLetras.textContent = totalEnLetras;
        }
    }

    // Auto imprimir tras carga de fuentes (700ms)
    setTimeout(() => {
        window.print();
    }, 700);
}

/**
 * Convierte un número a letras (Moneda: Lempiras)
 */
function numeroALetras(num) {
    const Unidades = (n) => {
        switch (n) {
            case 1: return "UN";
            case 2: return "DOS";
            case 3: return "TRES";
            case 4: return "CUATRO";
            case 5: return "CINCO";
            case 6: return "SEIS";
            case 7: return "SIETE";
            case 8: return "OCHO";
            case 9: return "NUEVE";
            default: return "";
        }
    };

    const Decenas = (n) => {
        let decena = Math.floor(n / 10);
        let unidad = n % 10;
        switch (decena) {
            case 1:
                switch (unidad) {
                    case 0: return "DIEZ";
                    case 1: return "ONCE";
                    case 2: return "DOCE";
                    case 3: return "TRECE";
                    case 4: return "CATORCE";
                    case 5: return "QUINCE";
                    default: return "DIECI" + Unidades(unidad);
                }
            case 2:
                if (unidad === 0) return "VEINTE";
                return "VEINTI" + Unidades(unidad);
            case 3: return DecenasY("TREINTA", unidad);
            case 4: return DecenasY("CUARENTA", unidad);
            case 5: return DecenasY("CINCUENTA", unidad);
            case 6: return DecenasY("SESENTA", unidad);
            case 7: return DecenasY("SETENTA", unidad);
            case 8: return DecenasY("OCHENTA", unidad);
            case 9: return DecenasY("NOVENTA", unidad);
            case 0: return Unidades(unidad);
        }
    };

    const DecenasY = (strSin, numUnid) => {
        if (numUnid > 0) return strSin + " Y " + Unidades(numUnid);
        return strSin;
    };

    const Centenas = (n) => {
        let centena = Math.floor(n / 100);
        let decena = n % 100;
        switch (centena) {
            case 1:
                if (decena > 0) return "CIENTO " + Decenas(decena);
                return "CIEN";
            case 2: return "DOSCIENTOS " + Decenas(decena);
            case 3: return "TRESCIENTOS " + Decenas(decena);
            case 4: return "CUATROCIENTOS " + Decenas(decena);
            case 5: return "QUINIENTOS " + Decenas(decena);
            case 6: return "SEISCIENTOS " + Decenas(decena);
            case 7: return "SETECIENTOS " + Decenas(decena);
            case 8: return "OCHOCIENTOS " + Decenas(decena);
            case 9: return "NOVECIENTOS " + Decenas(decena);
            default: return Decenas(decena);
        }
    };

    const Seccion = (n, divisor, strSingular, strPlural) => {
        let cientos = Math.floor(n / divisor);
        let resto = n % divisor;
        let letras = "";
        if (cientos > 0) {
            if (cientos > 1) letras = Centenas(cientos) + " " + strPlural;
            else letras = strSingular;
        }
        if (resto > 0) letras += (letras !== "" ? " " : "") + Centenas(resto);
        return letras;
    };

    const Miles = (n) => {
        let divisor = 1000;
        let cientos = Math.floor(n / divisor);
        let resto = n % divisor;
        let strMiles = Seccion(n, divisor, "MIL", "MIL");
        let strCentenas = Centenas(resto);
        if (strMiles === "") return strCentenas;
        return strMiles + " " + (strCentenas || "");
    };

    const Millones = (n) => {
        let divisor = 1000000;
        let cientos = Math.floor(n / divisor);
        let resto = n % divisor;
        let strMillones = Seccion(n, divisor, "UN MILLON", "MILLONES");
        let strMiles = Miles(resto);
        if (strMillones === "") return strMiles;
        return strMillones + " " + strMiles;
    };

    const enteros = Math.floor(num);
    const centavos = Math.round((num - enteros) * 100);
    const strCentavos = `${centavos.toString().padStart(2, "0")}/100`;

    let letrasEnteros = Millones(enteros).trim();
    if (enteros === 0) letrasEnteros = "CERO";
    if (enteros === 1) return `UN LEMPIRA CON ${strCentavos}`;
    
    return `${letrasEnteros} LEMPIRAS CON ${strCentavos}`;
}
