/**
 * ============================================================
 * ADMIN · GESTIÓN DE USUARIOS (THE ROASTMASTER'S LEDGER)
 * Conectividad con Supabase y Lógica de Roles
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initUsersAdmin();
});

async function initUsersAdmin() {
    console.log("☕ Cargando Directorio de Personal...");
    
    const { data: { session } } = await window.supabase.auth.getSession();
    
    // 1. Verificación de Seguridad Básica (Admin Only)
    // En producción, esto debería estar reforzado por RLS en Supabase
    if (!session) {
        window.location.href = "/pages/auth/login.html";
        return;
    }

    // 2. Cargar Datos Iniciales
    await fetchUsers();

    // 3. Event Listeners para Filtros y Búsqueda
    setupInteractions();
}

let allUsers = [];

async function fetchUsers() {
    const loadingElem = document.getElementById('loading-users');
    const tableBody = document.getElementById('users-tbody');
    
    try {
        loadingElem.classList.remove('hidden');
        
        // Consultamos la tabla pública 'users'
        const { data, error } = await window.supabase
            .from('users')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        allUsers = data;
        renderUsers(allUsers);
        updateStats(allUsers);

    } catch (err) {
        console.error("❌ Error al traer usuarios:", err.message);
        alert("No se pudo cargar la lista de usuarios. Verifica tu conexión.");
    } finally {
        loadingElem.classList.add('hidden');
    }
}

function renderUsers(usersList) {
    const tableBody = document.getElementById('users-tbody');
    const emptyState = document.getElementById('empty-state');
    
    tableBody.innerHTML = '';

    if (usersList.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    usersList.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'fade-in';
        
        const photo = user.photo_url || '/imagenes/avatar-default.svg';
        const roleClass = getRoleClass(user.rol);
        
        tr.innerHTML = `
            <td>
                <div class="user-profile">
                    <img src="${photo}" class="avatar" alt="${user.name}">
                    <div class="user-info">
                        <span class="user-name">${user.name || 'Sin nombre'}</span>
                        <span class="user-email">${user.email}</span>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="badge-role ${roleClass}">${user.rol || 'user'}</span>
            </td>
            <td>${user.country || 'No especificado'}</td>
            <td>
                <div class="status-active">Activo</div>
            </td>
            <td class="actions-col">
                <button class="action-btn" onclick="openUserMenu('${user.id}')">
                    <span class="material-symbols-outlined">more_vert</span>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function getRoleClass(role) {
    switch (role?.toLowerCase()) {
        case 'admin': return 'badge-admin';
        case 'moderator': return 'badge-mod';
        default: return 'badge-user';
    }
}

function updateStats(users) {
    const total = users.length;
    const admins = users.filter(u => u.rol === 'admin').length;
    
    document.getElementById('stat-total-users').textContent = total;
    document.getElementById('stat-admins').textContent = admins;
    document.getElementById('stat-suspended').textContent = '0'; // Lógica futura
}

function setupInteractions() {
    const searchInput = document.getElementById('user-search');
    const roleFilter = document.getElementById('filter-role');

    // --- 1. Lógica de Filtrado Centralizada ---
    const applyFilters = () => {
        const searchTerm = searchInput?.value.toLowerCase().trim() || "";
        const roleTerm = roleFilter?.value || "all";

        const filtered = allUsers.filter(u => {
            const matchesSearch = !searchTerm || 
                u.name?.toLowerCase().includes(searchTerm) || 
                u.email?.toLowerCase().includes(searchTerm);
            
            const matchesRole = roleTerm === "all" || u.rol === roleTerm;

            return matchesSearch && matchesRole;
        });

        renderUsers(filtered);
    };

    // --- 2. Eventos Locales (Inputs de la página) ---
    searchInput?.addEventListener('input', applyFilters);
    roleFilter?.addEventListener('change', applyFilters);

    // --- 3. EVENTOS GLOBALES (Desde el Header) ---
    document.addEventListener('user:search', (e) => {
        if (searchInput) {
            searchInput.value = e.detail;
            applyFilters();
        }
    });

    document.addEventListener('user:filter', (e) => {
        if (roleFilter) {
            roleFilter.value = e.detail;
            applyFilters();
        }
    });
}

// Global scope for HTML onclicks
window.openUserMenu = (userId) => {
    console.log("🛠️ Gestión de usuario ID:", userId);
    // Aquí abriríamos el modal de Stitch para cambiar rol o suspender
    alert("Función de edición de rol en desarrollo. ID: " + userId);
};
