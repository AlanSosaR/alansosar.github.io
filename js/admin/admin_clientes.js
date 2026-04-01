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

    // 2. ESTADO GLOBAL
    let allCustomers = [];
    let filteredCustomers = [];
    let selectedCustomerId = null;
    let historyPage = 1;
    const historyPerPage = 5;

    // Paginación de Lista de Clientes
    let custCurrentPage = 1;
    const custItemsPerPage = 4;

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
                .select("id, name, email, rol, country, photo_url, created_at")
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
                .select("total, status, order_number, created_at")
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
            const img = clone.querySelector(".card-img");
            const name = clone.querySelector(".card-name");
            const email = clone.querySelector(".card-email");

            if (customer.photo_url) img.src = customer.photo_url;
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

        cPhoto.src = customer.photo_url || "/imagenes/avatar-default.svg";
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

    // 6. EVENTOS DIRECTOS
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

    init();
};

// Carga Robusta
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminClientes);
} else {
    initAdminClientes();
}
