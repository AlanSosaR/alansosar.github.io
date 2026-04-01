/**
 * ============================================================
 * ADMIN · GESTIÓN DE USUARIOS (THE ROASTMASTER'S LEDGER)
 * Conectividad con Supabase y Lógica de Roles
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initUsersAdmin();
});

// --- ESTADO GLOBAL ---
let allUsers = [];
let filteredUsers = [];
let currentSearch = "";
let currentRole = "all";
let currentPage = 1;
const itemsPerPage = 5;

// --- FUNCIONES DE RENDERIZADO (MOVIDAS AL PRINCIPIO PARA EVITAR HOISTING ISSUES) ---

function getRoleClass(role) {
    switch (role?.toLowerCase()) {
        case 'admin': return 'badge-admin';
        case 'moderator': return 'badge-logistica';
        case 'tostador': return 'badge-tostador';
        case 'suspendido': return 'badge-suspendido';
        default: return 'badge-user';
    }
}

function getRoleLabel(role) {
    switch (role?.toLowerCase()) {
        case 'admin': return 'Administrador';
        case 'moderator': return 'Logística';
        case 'tostador': return 'Tostador Senior';
        case 'suspendido': return 'Suspendido';
        default: return 'Colaborador';
    }
}

function updateStats(usersList) {
    const total = usersList.length;
    const admins = usersList.filter(u => u.rol === 'admin').length;
    
    const uiTotal = document.getElementById('stat-total-users');
    const uiAdmins = document.getElementById('stat-admins');
    
    if (uiTotal) uiTotal.textContent = total;
    if (uiAdmins) uiAdmins.textContent = admins;
}

function renderUsers(usersList) {
    const tableBody = document.getElementById('users-tbody');
    const emptyState = document.getElementById('empty-state');
    
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (usersList.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    usersList.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'fade-in';
        
        const photo = user.photo_url || '/imagenes/avatar-default.svg';
        const roleClass = getRoleClass(user.rol);
        const roleLabel = getRoleLabel(user.rol);
        
        tr.innerHTML = `
            <td>
                <div class="user-profile">
                    <img src="${photo}" class="avatar" alt="${user.name}">
                    <div class="user-info">
                        <span class="user-name">${user.name || 'Sin nombre'}</span>
                        <span class="user-id">CC-${user.id.substring(0, 4)}</span>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="badge-role ${roleClass}">${roleLabel}</span>
            </td>
            <td>${user.country || 'Honduras'}</td>
            <td>
                <div class="status-active">Activo</div>
            </td>
            <td class="actions-col text-right">
                <button class="action-btn" onclick="openUserMenu('${user.id}')" title="Más opciones">
                    <span class="material-symbols-outlined">more_vert</span>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function updatePaginationUI() {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const pageNumbers = document.getElementById('page-numbers');

    const start = filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, filteredUsers.length);

    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages);
    if (pageInfo) pageInfo.textContent = `Mostrando ${start} - ${end} de ${filteredUsers.length} registros`;

    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `page-num ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.onclick = () => {
                currentPage = i;
                renderCurrentPage();
            };
            pageNumbers.appendChild(btn);
        }
    }
}

function renderCurrentPage() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredUsers.slice(startIndex, endIndex);

    renderUsers(pageItems);
    updatePaginationUI();
}

function applyFilters() {
    currentPage = 1; 
    
    filteredUsers = allUsers.filter(u => {
        const matchesSearch = !currentSearch || 
            u.name?.toLowerCase().includes(currentSearch) || 
            u.email?.toLowerCase().includes(currentSearch);
        
        const matchesRole = currentRole === "all" || u.rol === currentRole;

        return matchesSearch && matchesRole;
    });

    renderCurrentPage();
}

// --- LOGICA PRINCIPAL ---

async function initUsersAdmin() {
    console.log("☕ Cargando Directorio de Personal...");
    
    const { data: { session } } = await window.supabase.auth.getSession();
    
    if (!session) {
        window.location.href = "/pages/auth/login.html";
        return;
    }

    await fetchUsers();
    setupInteractions();
}

async function fetchUsers() {
    const loadingElem = document.getElementById('loading-users');
    
    try {
        if (loadingElem) loadingElem.classList.remove('hidden');
        
        const { data, error } = await window.supabase
            .from('users')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        allUsers = data;
        applyFilters(); 
        updateStats(allUsers);

    } catch (err) {
        console.error("❌ Error al traer usuarios:", err.message);
    } finally {
        if (loadingElem) loadingElem.classList.add('hidden');
    }
}

function setupInteractions() {
    document.addEventListener('user:search', (e) => {
        currentSearch = e.detail?.toLowerCase().trim() || "";
        applyFilters();
    });

    document.addEventListener('user:filter', (e) => {
        currentRole = e.detail || "all";
        applyFilters();
    });

    document.getElementById('prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderCurrentPage();
        }
    });

    document.getElementById('next-page')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderCurrentPage();
        }
    });
}

// Alcance Global para eventos HTML
window.openUserMenu = (userId) => {
    console.log("🛠️ Gestión de usuario ID:", userId);
    alert("Función de edición de rol en desarrollo. ID: " + userId);
};
