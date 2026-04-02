/**
 * ==========================================================
 * CAFÉ CORTERO - ADMIN USUARIOS (STITCH HIGH-FIDELITY)
 * Gestión de Personal y Seguridad Avanzada
 * ==========================================================
 */

const _supabase = window.supabase;

// --- ESTADO GLOBAL ---
let allUsers = [];
let filteredUsers = [];
let selectedUser = null;

// Paginación (Regla de 5 solicitada)
let currentPage = 1;
const itemsPerPage = 5;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    initEventListeners();
    await loadUsers();
});

function initEventListeners() {
    // Escuchar eventos del Header
    document.addEventListener('user:search', (e) => handleSearch(e.detail));
    document.addEventListener('user:filter', (e) => handleFilter(e.detail));

    // Flechas de Paginación
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

    // Acciones de Seguridad
    document.getElementById('btnResetPass')?.addEventListener('click', handleResetPassword);
    document.getElementById('btnSaveChanges')?.addEventListener('click', handleSaveChanges);
    
    // Toggle de Estado UI Feedback
    const toggle = document.getElementById('u-status-toggle');
    if(toggle) {
        toggle.addEventListener('change', (e) => {
            const label = document.querySelector('.status-label-stitch');
            if(label) label.textContent = e.target.checked ? "ACTIVO" : "INACTIVO";
        });
    }
}

// --- CARGA DE DATOS ---
async function loadUsers() {
    try {
        const { data, error } = await _supabase
            .from('users')
            .select('*, addresses(*)')
            .order('name', { ascending: true });

        if (error) throw error;

        allUsers = data || [];
        filteredUsers = [...allUsers];
        
        renderUsersList();
    } catch (err) {
        console.error("Error cargando usuarios:", err);
        showSnackbar("Error al conectar con el servidor", "error");
    }
}

// --- RENDERIZADO (LISTADO RECIENTE) ---
function renderUsersList() {
    const container = document.getElementById('users-list');
    const badge = document.getElementById('users-count-stitch');
    const tpl = document.getElementById('tpl-user-card');

    if (!container || !tpl) return;
    container.innerHTML = '';
    
    // Actualizar Contador (Sincronizado con Clientes)
    if (badge) badge.textContent = filteredUsers.length;

    // Calcular Paginación
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredUsers.slice(start, end);

    if (pageItems.length === 0) {
        container.innerHTML = '<div class="loading-state">No se encontraron resultados</div>';
        updatePaginationUI(0);
        return;
    }

    pageItems.forEach(u => {
        const clone = tpl.content.cloneNode(true);
        const card = clone.querySelector('.user-card-item-stitch');
        
        // Info Básica
        card.querySelector('.card-name-stitch').textContent = u.name || 'Sin nombre';
        card.querySelector('.card-email-stitch').textContent = u.email;
        
        // La flecha chevron_right ya está en el template, no necesita lógica adicional

        // Avatar
        const avatarPlaceholder = card.querySelector('.card-avatar-placeholder');
        avatarPlaceholder.innerHTML = getAvatarHtml(u, 'avatar-img-small', 'avatar-init-small');

        // Estado Activo UI
        if (selectedUser && selectedUser.id === u.id) {
            card.classList.add('active');
        }

        // Evento Click
        card.onclick = () => selectUser(u);

        container.appendChild(clone);
    });

    updatePaginationUI(Math.ceil(filteredUsers.length / itemsPerPage));
}

// --- SELECCIÓN Y FICHA (DETALLE STITCH) ---
function selectUser(user) {
    selectedUser = user;
    
    // UI Feedback en Sidebar
    renderUsersList();

    // Mostrar Sección Detalle
    const detailSection = document.getElementById('user-detail');
    const emptyState = document.getElementById('no-selection');

    if (detailSection) detailSection.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    // Calcular Dirección de Entrega Completa
    let finalAddress = user.country || 'No especificada';
    if (user.addresses && user.addresses.length > 0) {
        let addr = user.addresses.find(a => a.is_default);
        if (!addr) addr = user.addresses[0]; // Fallback
        const parts = [addr.street, addr.city, addr.state, addr.country].filter(Boolean);
        if (parts.length > 0) finalAddress = parts.join(', ');
    }

    // Llenar Datos Principales
    document.getElementById('u-name').textContent = user.name || 'Sin nombre';
    document.getElementById('u-email-text').textContent = user.email;
    document.getElementById('u-country-text').textContent = finalAddress;
    document.getElementById('u-avatar-placeholder').innerHTML = getAvatarHtml(user, 'avatar-img-large', 'avatar-init-large');
    
    // Estadísticas
    const regDate = new Date(user.created_at);
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    document.getElementById('u-reg-date-stat').textContent = `${months[regDate.getMonth()]} ${regDate.getFullYear()}`;
    
    // Panel de Seguridad
    document.getElementById('u-role-select').value = user.rol || 'user';
    document.getElementById('u-phone-text').textContent = user.phone || 'No registrado';
    document.getElementById('u-address-text').textContent = finalAddress;
    document.getElementById('u-created-at').textContent = regDate.toLocaleDateString();

    // Estado Toggle (Supuesto de columna 'status' o 'active' en BD, si no existe lo seteamos a true por defecto)
    const toggle = document.getElementById('u-status-toggle');
    const statusLabel = document.querySelector('.status-label-stitch');
    
    const isActive = user.status !== 'inactivo'; // Lógica basada en tu tabla oficial
    if(toggle) toggle.checked = isActive;
    if(statusLabel) statusLabel.textContent = isActive ? "ACTIVO" : "INACTIVO";

    // Efecto Feedback en Móvil (Scroll al inicio para ver el detalle actualizado)
    if (window.innerWidth <= 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    const isActive = document.getElementById('u-status-toggle').checked;
    const newStatus = isActive ? 'activo' : 'inactivo';
    
    try {
        const { error } = await _supabase
            .from('users')
            .update({ 
                rol: newRole,
                status: newStatus 
            })
            .eq('id', selectedUser.id);

        if (error) throw error;

        showSnackbar(`Configuración de ${selectedUser.name} actualizada`);
        
        // Actualizar datos locales
        selectedUser.rol = newRole;
        selectedUser.status = newStatus;
        const idx = allUsers.findIndex(u => u.id === selectedUser.id);
        if (idx !== -1) {
            allUsers[idx].rol = newRole;
            allUsers[idx].status = newStatus;
        }
        
        renderUsersList();
    } catch (err) {
        console.error("Error guardando cambios:", err);
        showSnackbar("Error al actualizar seguridad", "error");
    }
}

async function handleResetPassword() {
    if (!selectedUser) return;
    
    try {
        const redirectTo = `${window.location.origin}/pages/auth/new-password.html`;
        const { error } = await _supabase.auth.resetPasswordForEmail(selectedUser.email, {
            redirectTo: redirectTo
        });

        if (error) {
            console.error(error);
            showSnackbar("Error al enviar el enlace. Intenta más tarde.", "error");
            return;
        }

        showSnackbar(`Enlace de recuperación enviado con éxito a ${selectedUser.email}`);
    } catch (err) {
        console.error("Excepción en handleResetPassword:", err);
        showSnackbar("Ocurrió un error inesperado al restablecer.", "error");
    }
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

function getShortRoleName(role) {
    const map = { 'admin': 'ADMIN', 'moderator': 'MOD', 'user': 'SOCIO', 'suspendido': 'BLOQ' };
    return map[role] || 'SOCIO';
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
    snackbar.style.backgroundColor = type === "success" ? "#377B4C" : "#BA1A1A";
    
    snackbar.classList.add('active');
    setTimeout(() => snackbar.classList.remove('active'), 3000);
}
