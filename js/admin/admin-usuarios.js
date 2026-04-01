/**
 * Café Cortero — Gestión de Usuarios (Admin)
 * Lógica de renderizado Stitch 2.0 con soporte dual (Tabla/Cards)
 */

document.addEventListener("DOMContentLoaded", () => {
    initUsersAdmin();
});

async function initUsersAdmin() {
    console.log("☕ Cargando Directorio de Personal...");
    setupEventListeners();
    await fetchUsers();
}

function setupEventListeners() {
    document.addEventListener("user:search", (e) => handleSearch(e.detail));
    document.addEventListener("user:filter", (e) => handleFilter(e.detail));
    
    // Filtros locales si no se usa el del header
    const localSearch = document.getElementById("search-user");
    if(localSearch) localSearch.addEventListener("input", (e) => handleSearch(e.target.value));

    const localFilter = document.getElementById("filter-role");
    if(localFilter) localFilter.addEventListener("change", (e) => handleFilter(e.target.value));
}

let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const itemsPerPage = 4; // Densidad Stitch

async function fetchUsers() {
    try {
        const { data, error } = await window.supabase
            .from('users')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        allUsers = data || [];
        filteredUsers = [...allUsers];
        updateStats();
        renderCurrentPage();
    } catch (err) {
        console.error("❌ Error al traer usuarios:", err);
    }
}

function handleSearch(query) {
    const q = query.toLowerCase();
    filteredUsers = allUsers.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q))
    );
    currentPage = 1;
    renderCurrentPage();
}

function handleFilter(role) {
    if (role === 'all') {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(u => u.rol === role);
    }
    currentPage = 1;
    renderCurrentPage();
}

function updateStats() {
    const total = allUsers.length;
    const admins = allUsers.filter(u => u.rol === 'admin' || u.rol === 'moderator').length;
    const active = allUsers.filter(u => u.rol !== 'suspendido').length;

    const elTotal = document.getElementById('stat-total');
    const elAdmins = document.getElementById('stat-admins');
    const elActive = document.getElementById('stat-active');

    if(elTotal) elTotal.textContent = total;
    if(elAdmins) elAdmins.textContent = admins;
    if(elActive) elActive.textContent = active;
}

function getAvatarPlaceholder(name, imgClass) {
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    return `<div class="${imgClass} initials-avatar">${initials}</div>`;
}

function getAvatarHtml(user, imgClass) {
    const name = user.name || 'Sin nombre';
    // Si no hay foto, retornamos directamente las iniciales
    if (!user.photo_url) return getAvatarPlaceholder(name, imgClass);
    
    // Si hay foto, la envolvemos. Si falla, el CSS o un script mínimo puede manejarlo.
    // Usaremos una técnica más limpia sin romper el HTML.
    return `<img src="${user.photo_url}" class="${imgClass}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
            <div class="${imgClass} initials-avatar" style="display:none">${name[0].toUpperCase()}</div>`;
}

function renderCurrentPage() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredUsers.slice(start, end);

    renderUsers(paginatedItems);
    updatePaginationUI();
}

function renderUsers(usersList) {
    const tableBody = document.getElementById('users-tbody');
    const mobileList = document.getElementById('users-mobile-list');
    const emptyState = document.getElementById('empty-state');
    
    if (tableBody) tableBody.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';

    if (usersList.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    usersList.forEach(user => {
        const isSuspended = user.rol === 'suspendido';
        const roleLabel = (user.rol || 'USER').toUpperCase();
        const roleClass = `role-${user.rol || 'user'}`;
        
        // --- DESKTOP ---
        if (tableBody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="user-profile">
                        <div class="avatar-wrapper">${getAvatarHtml(user, 'avatar')}</div>
                        <div class="user-info">
                            <span class="user-name">${user.name || 'Sin nombre'}</span>
                        </div>
                    </div>
                </td>
                <td><span class="user-email">${user.email}</span></td>
                <td><span class="badge-role ${roleClass}">${roleLabel}</span></td>
                <td><span class="user-country">${user.country || 'Honduras'}</span></td>
                <td class="text-right">
                    <button class="action-btn" onclick="openUserMenu('${user.id}')">
                        <span class="material-symbols-outlined">more_vert</span>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        }

        // --- MOBILE ---
        if (mobileList) {
            const card = document.createElement('div');
            card.className = `user-card ${isSuspended ? 'status-suspended' : ''}`;
            card.innerHTML = `
                <div class="card-avatar-wrap">
                    <div class="avatar-wrapper">${getAvatarHtml(user, 'card-avatar')}</div>
                    ${!isSuspended ? '<div class="card-status-dot"></div>' : ''}
                </div>
                <div class="card-content">
                    <h3 class="card-name">${user.name || 'Sin nombre'}</h3>
                    <span class="card-email">${user.email}</span>
                    <div class="card-footer">
                        <span class="badge-role ${roleClass}">${roleLabel}</span>
                        <span class="font-label text-[10px] text-muted">${user.country || 'Honduras'}</span>
                    </div>
                </div>
                <span class="material-symbols-outlined card-icon">${isSuspended ? 'lock' : 'chevron_right'}</span>
            `;
            card.onclick = () => openUserMenu(user.id);
            mobileList.appendChild(card);
        }
    });
}

function updatePaginationUI() {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const info = document.getElementById('page-info');
    if (info) {
        info.textContent = `MOSTRANDO ${filteredUsers.length} REGISTROS`;
    }
    
    // Lógica básica de botones anterior/siguiente...
    const prev = document.getElementById('prev-page');
    const next = document.getElementById('next-page');
    if(prev) prev.disabled = currentPage === 1;
    if(next) next.disabled = currentPage === totalPages || totalPages === 0;

    prev.onclick = () => { if(currentPage > 1) { currentPage--; renderCurrentPage(); } };
    next.onclick = () => { if(currentPage < totalPages) { currentPage++; renderCurrentPage(); } };
}

window.openUserMenu = function(userId) {
    console.log("Abrir menú de usuario:", userId);
    // Aquí iría el modal de detalle
};
