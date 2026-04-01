/**
 * ============================================================
 * ADMIN CLIENTES - LÓGICA
 * Café Cortero - Premium & Minimalist
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
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

    // 3. INICIO
    const init = async () => {
        await fetchCustomers();
        renderCustomerList();
    };

    // 4. FUNCIONES DE DATOS
    const fetchCustomers = async () => {
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;
            allCustomers = data || [];
            filteredCustomers = [...allCustomers];
        } catch (err) {
            console.error("Error fetching customers:", err);
            listContainer.innerHTML = `<div class="error-state">Error al cargar clientes.</div>`;
        }
    };

    const fetchCustomerStats = async (userId) => {
        try {
            const { data: orders, error } = await supabase
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
            console.error("Error fetching stats:", err);
            return { totalSpent: "L 0.00", totalOrders: 0, orders: [] };
        }
    };

    // 5. RENDERIZADO
    const renderCustomerList = () => {
        listContainer.innerHTML = "";
        customersCount.textContent = filteredCustomers.length;

        if (filteredCustomers.length === 0) {
            listContainer.innerHTML = `<div class="empty-state-list">No se encontraron clientes.</div>`;
            return;
        }

        filteredCustomers.forEach(customer => {
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
    };

    const selectCustomer = async (customer) => {
        selectedCustomerId = customer.id;
        renderCustomerList(); // Refrescar para marcar el activo

        // Mostrar detalle / Ocultar vacío
        noSelection.classList.add("hidden");
        customerDetail.classList.remove("hidden");
        customerDetail.style.opacity = "0.5"; // Efecto de carga visual

        // Datos básicos
        cPhoto.src = customer.photo_url || "/imagenes/avatar-default.svg";
        cName.textContent = customer.name;
        cLocation.innerHTML = `<span class="material-symbols-outlined">location_on</span><span>${customer.country || "Ubicación desconocida"}</span>`;
        cRegDate.textContent = new Date(customer.created_at).toLocaleDateString("es-ES", { month: "short", year: "numeric" });

        // Cargar stats y órdenes
        const stats = await fetchCustomerStats(customer.id);
        cTotalSpent.textContent = stats.totalSpent;
        cTotalOrders.textContent = stats.totalOrders;

        // Reset historial
        historyPage = 1;
        customer.fetchedOrders = stats.orders; // Guardar temporalmente en el objeto
        renderHistory(stats.orders);

        customerDetail.style.opacity = "1";
    };

    const renderHistory = (orders) => {
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
            row.innerHTML = `
                <td><strong>#${order.order_number || "—"}</strong></td>
                <td>${new Date(order.created_at).toLocaleDateString("es-ES")}</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td class="text-right"><strong>L ${parseFloat(order.total).toFixed(2)}</strong></td>
            `;
            historyBody.appendChild(row);
        });

        const totalPages = Math.ceil(orders.length / historyPerPage);
        pageInfo.textContent = `Página ${historyPage} de ${totalPages || 1}`;
        
        // Paginación UI (Habilitar/Deshabilitar botones)
        document.getElementById("prev-page").disabled = historyPage === 1;
        document.getElementById("next-page").disabled = historyPage === totalPages || totalPages === 0;
    };

    // 6. FILTROS Y EVENTOS
    document.addEventListener("customer:search", (e) => {
        const query = e.detail.toLowerCase();
        filteredCustomers = allCustomers.filter(c => 
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.email && c.email.toLowerCase().includes(query)) ||
            (c.phone && c.phone.includes(query))
        );
        renderCustomerList();
    });

    document.addEventListener("customer:filter", (e) => {
        const role = e.detail;
        if (role === "todos") {
            filteredCustomers = [...allCustomers];
        } else {
            filteredCustomers = allCustomers.filter(c => c.rol === role);
        }
        renderCustomerList();
    });

    // Paginación del historial
    document.getElementById("prev-page").onclick = () => {
        if (historyPage > 1) {
            historyPage--;
            const customer = allCustomers.find(c => c.id === selectedCustomerId);
            renderHistory(customer.fetchedOrders);
        }
    };

    document.getElementById("next-page").onclick = () => {
        const customer = allCustomers.find(c => c.id === selectedCustomerId);
        const totalPages = Math.ceil(customer.fetchedOrders.length / historyPerPage);
        if (historyPage < totalPages) {
            historyPage++;
            renderHistory(customer.fetchedOrders);
        }
    };

    // Ejecutar
    init();
});
