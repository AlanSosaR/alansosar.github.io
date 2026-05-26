// Lógica de Admin Clientes
const initAdminClientes = () => {
    // 1. SELECTORES
    const listContainer = document.getElementById("customers-list");
    const customersCount = document.getElementById("customers-count");
    const customerDetail = document.getElementById("customer-detail");
    const noSelection = document.getElementById("no-selection");
    const tplCard = document.getElementById("tpl-customer-card");

    // Detalle
    const cPhoto = document.getElementById("c-photo");
    const cName = document.getElementById("c-name");
    const cLocation = document.getElementById("c-location");
    const cTotalSpent = document.getElementById("c-total-spent");
    const cTotalOrders = document.getElementById("c-total-orders");
    const cRegDate = document.getElementById("c-reg-date");
    const historyBody = document.getElementById("history-body");
    const pageInfo = document.getElementById("page-info");
    const btnContact = document.getElementById("btnSendMessage");

    // Modal Contacto Multicanal
    const modalContact = document.getElementById("modal-contact");
    const closeContactModal = document.getElementById("close-contact-modal");
    const contactClientName = document.getElementById("contact-client-name");
    const optWhatsApp = document.getElementById("opt-whatsapp");
    const optEmail = document.getElementById("opt-email");
    const optPush = document.getElementById("opt-push");

    // Modal Push
    const modalPush = document.getElementById("modal-push");
    const closePush = document.getElementById("close-push-modal");
    const cancelPush = document.getElementById("cancel-push");
    const sendPush = document.getElementById("send-push");
    const inputTitle = document.getElementById("push-title");
    const inputMessage = document.getElementById("push-message");

    // 2. ESTADO GLOBAL
    let allCustomers = [];
    let filteredCustomers = [];
    let selectedCustomerId = null;
    let historyPage = 1;
    const historyPerPage = 5;

    // Paginación de Lista de Clientes
    let custCurrentPage = 1;
    const custItemsPerPage = 5;

    // 3. INICIO
    const init = async () => {
        console.log("🚀 Iniciando Admin Clientes...");
        if (!window.supabase) {
            console.error("❌ Error: Supabase no detectado en render");
            if(listContainer) listContainer.innerHTML = `<div class="error-state">Error: Cliente no inicializado.</div>`;
            return;
        }

        // Verificamos sesión para depurar problemas de RLS
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session) {
            console.log(`👤 Sesión activa: ${session.user.email} (ID: ${session.user.id})`);
        } else {
            console.warn("⚠️ No hay sesión activa. Posible causa de lista vacía por RLS.");
        }

        await fetchCustomers();
        renderCustomerList();
    };

    // 4. FUNCIONES DE DATOS
    const fetchCustomers = async () => {
        try {
            console.log("📥 Consultando clientes (v. columns)...");
            // Pedimos columnas específicas para evitar bloqueos por RLS en columnas sensibles si no se es admin
            const { data, error } = await window.supabase
                .from("users")
                .select("id, name, email, phone, rol, country, photo_url, created_at")
                .order("name", { ascending: true });

            if (error) {
                console.error("❌ Error de Supabase:", error);
                throw error;
            }
            
            console.log(`✅ Clientes cargados: ${data?.length || 0}`);
            allCustomers = data || [];
            filteredCustomers = [...allCustomers];
        } catch (err) {
            console.error("❌ Error fetchCustomers:", err);
            if(listContainer) listContainer.innerHTML = `<div class="error-state">Error al cargar clientes: ${err.message || 'Error desconocido'}</div>`;
        }
    };

    const fetchCustomerStats = async (userId) => {
        try {
            const { data: orders, error } = await window.supabase
                .from("orders")
                .select("id, total, status, order_number, created_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const totalSpent = orders.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
            return {
                totalSpent: totalSpent.toLocaleString("es-HN", { style: "currency", currency: "HNL" }),
                totalOrders: orders.length,
                orders: orders
            };
        } catch (err) {
            console.error("❌ Error fetching stats:", err);
            return { totalSpent: "L 0.00", totalOrders: 0, orders: [] };
        }
    };



    // 5. RENDERIZADO
    const renderCustomerList = () => {
        if (!listContainer) return;

        listContainer.innerHTML = "";
        customersCount.textContent = filteredCustomers.length;

        if (filteredCustomers.length === 0) {
            listContainer.innerHTML = `<div class="empty-state-list">No se encontraron clientes.</div>`;
            return;
        }

        const totalPages = Math.ceil(filteredCustomers.length / custItemsPerPage);
        const start = (custCurrentPage - 1) * custItemsPerPage;
        const end = start + custItemsPerPage;
        const pageItems = filteredCustomers.slice(start, end);

        pageItems.forEach(customer => {
            const clone = tplCard.content.cloneNode(true);
            const card = clone.querySelector(".customer-card");
            const avatarPlaceholder = clone.querySelector(".card-avatar-placeholder");
            const name = clone.querySelector(".card-name");
            const email = clone.querySelector(".card-email");

            // Avatar Dinámico (Foto o Iniciales)
            avatarPlaceholder.innerHTML = getAvatarHtml(customer, "card-img", "avatar-init-small");
            name.textContent = customer.name || "Sin nombre";
            email.textContent = customer.email || "Sin email";

            if (selectedCustomerId === customer.id) card.classList.add("active");

            card.onclick = () => selectCustomer(customer);
            listContainer.appendChild(clone);
        });

        renderCustPagination(totalPages);
    };

    const renderCustPagination = (totalPages) => {
        const prevBtn = document.getElementById("cust-prev");
        const nextBtn = document.getElementById("cust-next");
        const numbersDiv = document.getElementById("cust-page-numbers");

        if (!prevBtn || !nextBtn || !numbersDiv) return;

        numbersDiv.innerHTML = "";
        
        for(let i=1; i<=totalPages; i++) {
            if (i > 3 && i < totalPages) {
                if (i === 4) {
                    const span = document.createElement("span");
                    span.textContent = "...";
                    numbersDiv.appendChild(span);
                }
                continue;
            }
            const btn = document.createElement("button");
            btn.className = `page-btn ${i === custCurrentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.onclick = () => {
                custCurrentPage = i;
                renderCustomerList();
                listContainer.scrollTop = 0;
            };
            numbersDiv.appendChild(btn);
        }

        prevBtn.disabled = custCurrentPage === 1;
        nextBtn.disabled = custCurrentPage === totalPages || totalPages === 0;

        prevBtn.onclick = () => {
            if (custCurrentPage > 1) {
                custCurrentPage--;
                renderCustomerList();
                listContainer.scrollTop = 0;
            }
        };

        nextBtn.onclick = () => {
            if (custCurrentPage < totalPages) {
                custCurrentPage++;
                renderCustomerList();
                listContainer.scrollTop = 0;
            }
        };
    };

    const selectCustomer = async (customer) => {
        selectedCustomerId = customer.id;
        renderCustomerList();

        noSelection.classList.add("hidden");
        customerDetail.classList.remove("hidden");
        customerDetail.style.opacity = "0.5";
        document.body.classList.add("detail-view-active");

        const cPhotoWrapper = document.getElementById("c-photo-wrapper");
        if (cPhotoWrapper) {
            cPhotoWrapper.innerHTML = getAvatarHtml(customer, "profile-img", "avatar-init-large");
        }
        
        cName.textContent = customer.name;
        cLocation.innerHTML = `<span class="material-symbols-outlined">location_on</span><span>${customer.country || "Ubicación desconocida"}</span>`;
        cRegDate.textContent = new Date(customer.created_at).toLocaleDateString("es-ES", { month: "short", year: "numeric" });

        const stats = await fetchCustomerStats(customer.id);
        cTotalSpent.textContent = stats.totalSpent;
        cTotalOrders.textContent = stats.totalOrders;

        historyPage = 1;
        customer.fetchedOrders = stats.orders;
        renderHistory(stats.orders);

        customerDetail.style.opacity = "1";
    };

    const renderHistory = (orders) => {
        if (!historyBody) return;
        historyBody.innerHTML = "";
        
        const start = (historyPage - 1) * historyPerPage;
        const end = start + historyPerPage;
        const paginated = orders.slice(start, end);

        if (paginated.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color: #999;">Sin historial de compras</td></tr>`;
            pageInfo.textContent = "Sin pedidos";
            return;
        }

        paginated.forEach(order => {
            const row = document.createElement("tr");
            row.className = `status-row-${order.status}`;
            row.style.cursor = "pointer";
            row.onclick = () => {
                window.location.href = `/pages/admin/admin-pedido-detalle.html?id=${order.id}`;
            };
            row.innerHTML = `
                <td><strong>Pedido #${order.order_number || "—"}</strong></td>
                <td>${new Date(order.created_at).toLocaleDateString("es-ES", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td class="text-right"><strong>L ${parseFloat(order.total).toFixed(2)}</strong></td>
            `;
            historyBody.appendChild(row);
        });

        const totalPages = Math.ceil(orders.length / historyPerPage);
        pageInfo.textContent = `Página ${historyPage} de ${totalPages || 1}`;
        
        document.getElementById("prev-page").disabled = historyPage === 1;
        document.getElementById("next-page").disabled = historyPage === totalPages || totalPages === 0;
    };

    const backToList = () => {
        document.body.classList.remove("detail-view-active");
        selectedCustomerId = null;
        renderCustomerList();
    };

    // 6. EVENTOS DIRECTOS
    document.getElementById("btn-back-to-list")?.addEventListener("click", backToList);

    document.addEventListener("customer:search", (e) => {
        const query = e.detail.toLowerCase();
        filteredCustomers = allCustomers.filter(c => 
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.email && c.email.toLowerCase().includes(query)) ||
            (c.phone && c.phone.includes(query))
        );
        custCurrentPage = 1;
        renderCustomerList();
    });

    document.addEventListener("customer:filter", (e) => {
        const role = e.detail;
        if (role === "todos") {
            filteredCustomers = [...allCustomers];
        } else {
            filteredCustomers = allCustomers.filter(c => c.rol === role);
        }
        custCurrentPage = 1;
        renderCustomerList();
    });

    document.getElementById("prev-page").onclick = () => {
        if (historyPage > 1) {
            historyPage--;
            const customer = allCustomers.find(c => c.id === selectedCustomerId);
            renderHistory(customer.fetchedOrders);
        }
    };

    document.getElementById("next-page").onclick = () => {
        const customer = allCustomers.find(c => c.id === selectedCustomerId);
        if (!customer || !customer.fetchedOrders) return;
        const totalPages = Math.ceil(customer.fetchedOrders.length / historyPerPage);
        if (historyPage < totalPages) {
            historyPage++;
            renderHistory(customer.fetchedOrders);
        }
    };

    // 7. CONTACTO MULTICANAL
    const openContactModal = (id) => {
        if (id) selectedCustomerId = id;
        if (!selectedCustomerId) {
            console.warn("⚠️ No customer selected when calling openContactModal");
            return;
        }
        
        const customer = allCustomers.find(c => c.id === selectedCustomerId);
        if (contactClientName) contactClientName.textContent = customer?.name || 'el cliente';
        
        modalContact.classList.remove("hidden");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modalContact.classList.add("active");
            });
        });
    };

    const closeContactModalFn = () => {
        modalContact.classList.remove("active");
        setTimeout(() => modalContact.classList.add("hidden"), 300);
    }

    const openPushModal = () => {
        closeContactModalFn();
        modalPush.classList.remove("hidden");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modalPush.classList.add("active");
            });
        });
    }

    const closePushModal = () => {
        modalPush.classList.remove("active");
        setTimeout(() => modalPush.classList.add("hidden"), 300);
    }

    const showSnack = (text, type = "info") => {
        const snack = document.getElementById("admin-snackbar");
        const snackMsg = document.getElementById("snack-text");
        const snackIcon = document.getElementById("snack-icon");

        if (!snack || !snackMsg || !snackIcon) return;

        snackMsg.textContent = text;
        snackIcon.textContent = type === "success" ? "check_circle" : (type === "error" ? "error" : "info");
        snack.className = `snackbar active ${type}`;

        setTimeout(() => snack.classList.remove("active"), 3500);
    };

    const showActionConfirm = (text) => {
        return new Promise((resolve) => {
            const snack = document.getElementById("confirm-snackbar");
            const label = document.getElementById("confirm-text");
            const btnOk = document.getElementById("btn-confirm-ok");
            const btnCancel = document.getElementById("btn-confirm-cancel");

            if (!snack || !label || !btnOk || !btnCancel) return resolve(false);

            label.innerHTML = text;
            
            const cleanup = (result) => {
                btnOk.replaceWith(btnOk.cloneNode(true));
                btnCancel.replaceWith(btnCancel.cloneNode(true));
                snack.classList.remove("active");
                setTimeout(() => snack.classList.add("hidden"), 300);
                resolve(result);
            };

            snack.classList.remove("hidden");
            requestAnimationFrame(() => requestAnimationFrame(() => snack.classList.add("active")));

            document.getElementById("btn-confirm-ok").onclick = () => cleanup(true);
            document.getElementById("btn-confirm-cancel").onclick = () => cleanup(false);
        });
    };

    const handleSendPush = async () => {
        const title = inputTitle.value.trim();
        const message = inputMessage.value.trim();

        if (!title || !message) {
            showSnack("Por favor completa el título y el mensaje", "error");
            return;
        }

        if (!selectedCustomerId) {
            showSnack("No hay un cliente seleccionado", "error");
            return;
        }

        try {
            sendPush.disabled = true;
            sendPush.innerHTML = `<span class="material-symbols-outlined rotating">sync</span><span>Enviando...</span>`;

            const { error } = await window.supabase
                .from("notifications")
                .insert([
                    {
                        user_id: selectedCustomerId,
                        title: title,
                        message: message,
                        type: "push_admin",
                        is_read: false,
                        push_sent: false
                    }
                ]);

            if (error) throw error;

            showSnack("Notificación enviada con éxito", "success");
            closePushModal();
        } catch (err) {
            console.error("❌ Error enviando push:", err);
            showSnack("Error: " + (err.message || "No se pudo enviar la notificación"), "error");
        } finally {
            sendPush.disabled = false;
            sendPush.innerHTML = `<span class="material-symbols-outlined">send</span><span>Enviar Notificación</span>`;
        }
    };

    // Eventos del Modal
    if (btnContact) {
        btnContact.onclick = () => {
            console.log("🖱️ Clic en botone Contactar. Cliente ID:", selectedCustomerId);
            openContactModal();
        };
    }
    if (closeContactModal) closeContactModal.onclick = closeContactModalFn;
    modalContact?.addEventListener("click", (e) => { 
        if (e.target === modalContact) {
            console.log("🖱️ Clic fuera del modal para cerrar");
            closeContactModalFn();
        }
    });

    // Opciones de Contacto
    if (optWhatsApp) optWhatsApp.onclick = () => {
        const customer = allCustomers.find(c => c.id === selectedCustomerId);
        if (!customer?.phone) {
            showSnack("Este cliente no tiene número de teléfono registrado", "error");
            closeContactModalFn();
            return;
        }
        closeContactModalFn();
        openWhatsAppModal(customer);
    };

    if (optEmail) optEmail.onclick = () => {
        const customer = allCustomers.find(c => c.id === selectedCustomerId);
        if (customer?.email) {
            window.open(`mailto:${customer.email}`, "_blank");
        } else {
            showSnack("Este cliente no tiene email registrado", "error");
        }
        closeContactModalFn();
    };

    if (optPush) optPush.onclick = openPushModal;

    if (closePush) closePush.onclick = closePushModal;
    if (cancelPush) cancelPush.onclick = closePushModal;
    if (sendPush) sendPush.onclick = handleSendPush;
    modalPush?.addEventListener("click", (e) => { if (e.target === modalPush) closePushModal(); });

    // WhatsApp Modal
    const openWhatsAppModal = (customer) => {
        const modal = document.getElementById("modal-whatsapp");
        const nameSpan = document.getElementById("whatsapp-client-name");
        const phoneSpan = document.getElementById("whatsapp-client-phone");
        const msg = document.getElementById("whatsapp-message");
        if (nameSpan) nameSpan.textContent = customer.name || "Cliente";
        if (phoneSpan) phoneSpan.textContent = customer.phone || "—";
        if (msg) msg.value = "";
        modal.classList.remove("hidden");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add("active");
                if (msg) msg.focus();
            });
        });
    };

    const closeWhatsAppModal = () => {
        const modal = document.getElementById("modal-whatsapp");
        modal.classList.remove("active");
        setTimeout(() => modal.classList.add("hidden"), 300);
    };

    document.getElementById("close-whatsapp-modal")?.addEventListener("click", closeWhatsAppModal);
    document.getElementById("cancel-whatsapp")?.addEventListener("click", closeWhatsAppModal);
    document.getElementById("send-whatsapp")?.addEventListener("click", async () => {
        const customer = allCustomers.find(c => c.id === selectedCustomerId);
        const phone = customer?.phone;
        const message = document.getElementById("whatsapp-message")?.value.trim();
        if (!message) return showSnack("Escribe un mensaje", "error");
        if (!phone) return showSnack("No hay teléfono", "error");

        try {
            const cleanPhone = phone.replace(/\D/g, "");
            const hasCountryCode = phone.trim().startsWith("+");
            const fullNumber = hasCountryCode ? cleanPhone : `504${cleanPhone}`;
            const waApi = "http://132.145.42.123:8080";
            const waKey = "429683C4C977415CAAFCCE10F7D57E11";

            const res = await fetch(`${waApi}/message/sendText/CafeCortero`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: waKey },
                body: JSON.stringify({ number: fullNumber, text: message })
            });

            if (!res.ok) throw new Error("HTTP " + res.status);
            showSnack("WhatsApp enviado con éxito", "success");
            closeWhatsAppModal();
        } catch (err) {
            console.error("❌ Error al enviar WhatsApp:", err);
            showSnack("Error al enviar WhatsApp", "error");
        }
    });

    init();
};

// Utils
const getAvatarHtml = (user, imgClass, initialClass) => {
    const name = user.name || 'Sin nombre';
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    
    if (user.photo_url) {
        return `<img src="${user.photo_url}" class="${imgClass}" alt="${name}" onerror="this.outerHTML='<div class=\\'${initialClass}\\'>${initials}</div>'">`;
    }
    return `<div class="${initialClass}">${initials}</div>`;
};

// Carga Robusta
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminClientes);
} else {
    initAdminClientes();
}
