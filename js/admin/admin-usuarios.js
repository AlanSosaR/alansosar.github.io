/**
 * Café Cortero — Gestión de Usuarios (Admin)
 * Paridad 100% con Referencia Stitch Institucional
 */

document.addEventListener("DOMContentLoaded", () => {
    initUsersAdmin();
});

async function initUsersAdmin() {
    console.log("☕ Cargando Directorio de Personal Institucional...");
    setupEventListeners();
    await fetchUsers();
}

function setupEventListeners() {
    document.addEventListener("user:search", (e) => handleSearch(e.detail));
    document.addEventListener("user:filter", (e) => handleFilter(e.detail));
    const localSearch = document.getElementById("search-user");
    if(localSearch) localSearch.addEventListener("input", (e) => handleSearch(e.target.value));
    const localFilter = document.getElementById("filter-role");
    if(localFilter) localFilter.addEventListener("change", (e) => handleFilter(e.target.value));
}

let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const itemsPerPage = 4;

async function fetchUsers() {
    try {
        const { data, error } = await window.supabase
            .from('users')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        allUsers = data || [];
        filteredUsers = [...allUsers];
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

function getAvatarHtml(user, imgClass) {
    const name = user.name || 'Sin nombre';
    const photo = user.photo_url;
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    
    if (!photo) {
        return `<div class="${imgClass} initials-avatar">${initials}</div>`;
    }
    
    return `
        <div class="avatar-wrapper">
            <img src="${photo}" class="${imgClass} avatar" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
            <div class="${imgClass} initials-avatar" style="display:none">${initials}</div>
        </div>
    `;
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
    
    if (tableBody) tableBody.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';

    usersList.forEach(user => {
        const isSuspended = user.rol === 'suspendido';
        const roleLabel = getFormattedRole(user.rol);
        const roleClass = `role-${user.rol || 'user'}`;
        const userId = user.id ? `ID: CC-${user.id.substring(0, 4)}` : '';
        
        // --- TABLE ROW ---
        if (tableBody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="user-profile">
                        ${getAvatarHtml(user, 'avatar')}
                        <div class="user-info">
                            <h4 class="user-name">${user.name || 'Sin nombre'}</h4>
                            <span class="user-id">${userId}</span>
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

        // --- MOBILE CARD ---
        if (mobileList) {
            const card = document.createElement('div');
            card.className = `user-card ${isSuspended ? 'status-suspended' : ''}`;
            card.innerHTML = `
                <div class="card-avatar-wrap">
                    ${getAvatarHtml(user, 'card-avatar')}
                </div>
                <div class="card-content">
                    <h3 class="card-name">${user.name || 'Sin nombre'}</h3>
                    <span class="card-email">${user.email}</span>
                </div>
                <span class="material-symbols-outlined card-icon">chevron_right</span>
            `;
            card.onclick = () => openUserMenu(user.id);
            mobileList.appendChild(card);
        }
    });
}

function getFormattedRole(role) {
    const roles = {
        'admin': 'Administrador',
        'moderator': 'Tostador Senior',
        'user': 'Personal',
        'suspendido': 'Suspendido'
    };
    return (roles[role] || role || 'USER').toUpperCase();
}

function updatePaginationUI() {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const info = document.getElementById('page-info');
    if (info) info.textContent = `Mostrando ${filteredUsers.length} de 152 registros`; // Placeholder exacto de la imagen
    
    const prev = document.getElementById('prev-page');
    const next = document.getElementById('next-page');
    const numbers = document.getElementById('page-numbers');

    if(prev) prev.onclick = () => { if(currentPage > 1) { currentPage--; renderCurrentPage(); } };
    if(next) next.onclick = () => { if(currentPage < totalPages) { currentPage++; renderCurrentPage(); } };

    if (numbers) {
        numbers.innerHTML = '';
        for (let i = 1; i <= Math.min(totalPages, 3); i++) {
            const span = document.createElement('span');
            span.className = `page-num ${i === currentPage ? 'active' : ''}`;
            span.textContent = i;
            span.onclick = () => { currentPage = i; renderCurrentPage(); };
            numbers.appendChild(span);
        }
    }
}

window.openUserMenu = function(userId) { console.log("Menú:", userId); };
