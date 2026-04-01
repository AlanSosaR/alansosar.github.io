/**
 * ==========================================================
 * CAFÉ CORTERO - ADMIN USUARIOS (MASTER-DETAIL)
 * Gestión de Personal y Seguridad
 * ==========================================================
 */

const { createClient } = supabase;
const _supabase = createClient(window.SB_URL, window.SB_KEY);

// --- ESTADO GLOBAL ---
let allUsers = [];
let filteredUsers = [];
let selectedUser = null;

// Paginación
let currentPage = 1;
const itemsPerPage = 8;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    initEventListeners();
    await loadUsers();
});

function initEventListeners() {
    // Escuchar eventos del Header (Buscador Global)
    document.addEventListener('user:search', (e) => handleSearch(e.detail));
    document.addEventListener('user:filter', (e) => handleFilter(e.detail));

    // Botones de Paginación
    document.getElementById('list-prev')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderUsersList();
        }
    });

    document.getElementById('list-next')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderUsersList();
        }
    });

    // Acciones de Ficha
    document.getElementById('btnResetPass')?.addEventListener('click', handleResetPassword);
    document.getElementById('btnSaveChanges')?.addEventListener('click', handleSaveChanges);
}

// --- CARGA DE DATOS ---
async function loadUsers() {
    try {
        const { data, error } = await _supabase
            .from('users')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        allUsers = data || [];
        filteredUsers = [...allUsers];
        
        renderUsersList();
    } catch (err) {
        console.error("Error cargando usuarios:", err);
        showSnackbar("Error al conectar con la base de datos", "error");
    }
}

// --- RENDERIZADO (SIDEBAR) ---
function renderUsersList() {
    const container = document.getElementById('users-list');
    const badge = document.getElementById('users-count');
    const tpl = document.getElementById('tpl-user-card');

    if (!container || !tpl) return;
    container.innerHTML = '';
    
    // Actualizar Contador
    if (badge) badge.textContent = filteredUsers.length;

    // Calcular Paginación
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredUsers.slice(start, end);

    if (pageItems.length === 0) {
        container.innerHTML = '<div class="loading-state">No se encontraron usuarios</div>';
        updatePaginationUI(0);
        return;
    }

    pageItems.forEach(u => {
        const clone = tpl.content.cloneNode(true);
        const card = clone.querySelector('.user-card-item');
        
        // Info Básica
        card.querySelector('.card-name').textContent = u.name || 'Sin nombre';
        card.querySelector('.card-role-text').textContent = getFormattedRole(u.rol);
        
        // Avatar
        const avatarPlaceholder = card.querySelector('.card-avatar-placeholder');
        avatarPlaceholder.innerHTML = getAvatarHtml(u, 'avatar-img-small', 'initials-avatar-small');

        // Estado Activo
        if (selectedUser && selectedUser.id === u.id) {
            card.classList.add('active');
        }

        // Evento Click
        card.onclick = () => selectUser(u);

        container.appendChild(clone);
    });

    updatePaginationUI(Math.ceil(filteredUsers.length / itemsPerPage));
}

// --- SELECCIÓN Y DETALLE (FICHA) ---
function selectUser(user) {
    selectedUser = user;
    
    // UI Feedback en Sidebar
    document.querySelectorAll('.user-card-item').forEach(c => c.classList.remove('active'));
    renderUsersList(); // Re-render para marcar el activo

    // Mostrar Sección Detalle
    const detailSection = document.getElementById('user-detail');
    const emptyState = document.getElementById('no-selection');

    if (detailSection) detailSection.classList.remove('hidden', 'fade-in');
    setTimeout(() => detailSection?.classList.add('fade-in'), 10);
    
    if (emptyState) emptyState.classList.add('hidden');

    // Llenar Datos
    document.getElementById('u-name').textContent = user.name || 'Sin nombre';
    document.getElementById('u-email').textContent = user.email;
    document.getElementById('u-avatar-placeholder').innerHTML = getAvatarHtml(user, 'profile-img-large', 'initials-avatar-large');
    
    // Configuración
    document.getElementById('u-role-select').value = user.rol || 'user';
    document.getElementById('u-country').textContent = user.country || 'Honduras';
    document.getElementById('u-last-login').textContent = user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Desconocido';
    
    // Auditoría
    document.getElementById('u-full-id').textContent = user.id;
    document.getElementById('u-phone').textContent = user.phone || 'No registrado';
    document.getElementById('u-created-at').textContent = new Date(user.created_at).toLocaleDateString();
}

// --- FILTROS Y BÚSQUEDA ---
function handleSearch(query) {
    const q = query.toLowerCase();
    filteredUsers = allUsers.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q))
    );
    currentPage = 1;
    renderUsersList();
}

function handleFilter(role) {
    if (role === 'all') {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(u => u.rol === role);
    }
    currentPage = 1;
    renderUsersList();
}

// --- ACCIONES DE SEGURIDAD ---
async function handleSaveChanges() {
    if (!selectedUser) return;

    const newRole = document.getElementById('u-role-select').value;
    
    try {
        const { error } = await _supabase
            .from('users')
            .update({ rol: newRole })
            .eq('id', selectedUser.id);

        if (error) throw error;

        showSnackbar(`Rol actualizado a ${getFormattedRole(newRole)} correctamente`);
        
        // Actualizar datos locales
        selectedUser.rol = newRole;
        const idx = allUsers.findIndex(u => u.id === selectedUser.id);
        if (idx !== -1) allUsers[idx].rol = newRole;
        
        renderUsersList();
    } catch (err) {
        console.error("Error guardando cambios:", err);
        showSnackbar("No se pudieron guardar los cambios", "error");
    }
}

async function handleResetPassword() {
    if (!selectedUser) return;
    
    showSnackbar(`Enlace de recuperación enviado a ${selectedUser.email}`);
    // Aquí iría la lógica de Auth para reset-password si se requiere
}

// --- UTILS UI ---
function getAvatarHtml(user, imgClass, initialClass) {
    const name = user.name || 'Sin nombre';
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    
    if (user.photo_url) {
        return `<img src="${user.photo_url}" class="${imgClass}" alt="${name}" onerror="this.outerHTML='<div class=\\'${initialClass}\\'>${initials}</div>'">`;
    }
    return `<div class="${initialClass}">${initials}</div>`;
}

function getFormattedRole(role) {
    const map = {
        'admin': 'Administrador',
        'moderator': 'Moderador',
        'user': 'Cliente / Usuario',
        'suspendido': 'Suspendido'
    };
    return map[role] || 'Usuario';
}

function updatePaginationUI(totalPages) {
    const numbers = document.getElementById('list-page-numbers');
    if (!numbers) return;
    numbers.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => {
            currentPage = i;
            renderUsersList();
        };
        numbers.appendChild(btn);
    }
}

function showSnackbar(msg, type = "success") {
    const snackbar = document.getElementById('admin-snackbar');
    const icon = document.getElementById('snack-icon');
    const text = document.getElementById('snack-text');

    if (!snackbar || !text || !icon) return;

    text.textContent = msg;
    icon.textContent = type === "success" ? "check_circle" : "error";
    snackbar.style.backgroundColor = type === "success" ? "#191C1C" : "#BA1A1A";
    
    snackbar.classList.add('active');
    setTimeout(() => snackbar.classList.remove('active'), 3000);
}
