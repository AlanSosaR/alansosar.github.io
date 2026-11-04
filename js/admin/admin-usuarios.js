/**
 * ==========================================================
 * CAFÉ CORTERO - ADMIN USUARIOS (UNIFICADO CON CLIENTES)
 * Gestión de Personal y Seguridad Avanzada
 * ==========================================================
 */

const _supabase = window.supabase;

// --- ESTADO GLOBAL ---
let allUsers = [];
let filteredUsers = [];
let selectedUser = null;

// Paginación (Regla de 8 o 5)
let currentPage = 1;
const itemsPerPage = 8;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    // Restaurar inmediatamente el estado en móvil si hay id en URL o sessionStorage para no parpadear
    try {
        const p = new URLSearchParams(window.location.search);
        const savedId = p.get("id") || sessionStorage.getItem("admin_selected_user_id");
        if (savedId) {
            document.body.classList.add("detail-view-active");
            const detailSection = document.getElementById('user-detail');
            const emptyState = document.getElementById('no-selection');
            if (detailSection) detailSection.classList.remove('hidden');
            if (emptyState) emptyState.classList.add('hidden');
        }
    } catch (e) {}

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
    
    // Contactar - Abrir Modal Multicanal
    document.getElementById('btnContact')?.addEventListener('click', openContactModal);
    
    // Cerrar Modales
    document.getElementById('close-contact-modal')?.addEventListener('click', closeContactModal);
    document.getElementById('close-push-modal')?.addEventListener('click', closePushModal);
    document.getElementById('cancel-push')?.addEventListener('click', closePushModal);

    // Selección de Vía de Contacto
    document.getElementById('opt-whatsapp')?.addEventListener('click', handleWhatsApp);
    document.getElementById('opt-email')?.addEventListener('click', handleEmail);
    document.getElementById('opt-push')?.addEventListener('click', openPushModal);

    // Enviar Alerta Push
    document.getElementById('send-push')?.addEventListener('click', handleSendPush);

    // Volver a la Lista (Mobile)
    document.getElementById('btn-back-to-list')?.addEventListener('click', backToList);
    document.getElementById('header-customer-detail-back')?.addEventListener('click', backToList);
    document.addEventListener("click", (e) => {
        if (e.target.closest("#header-customer-detail-back, .header-customer-detail-back-btn, #btn-back-to-list")) {
            backToList();
        }
    });

    // Filtros por Chips
    document.querySelectorAll('.users-filter-chips .customer-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.users-filter-chips .customer-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            handleFilter(chip.dataset.filter);
        });
    });

    // Cerrar modal al tocar overlay
    document.getElementById('modal-contact')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-contact')) closeContactModal();
    });

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
        window.__adminUsers = allUsers;

        updateChipCounts();
        document.dispatchEvent(new CustomEvent("users:ready"));

        renderUsersList();

        // Restaurar selección desde URL ?id= o sessionStorage
        const params = new URLSearchParams(window.location.search);
        const preselectedId = params.get("id") || sessionStorage.getItem("admin_selected_user_id");
        if (preselectedId) {
            const found = allUsers.find(u => u.id === preselectedId);
            if (found) {
                selectUser(found);
            }
        }
    } catch (err) {
        console.error("Error cargando usuarios:", err);
        showSnack("error", "Error al conectar con el servidor");
    }
}

function updateChipCounts() {
    const totalAll = allUsers.length;
    const totalAdmin = allUsers.filter(u => u.rol === 'admin').length;
    const totalUser = allUsers.filter(u => u.rol === 'user' || !u.rol || u.rol !== 'admin').length;

    const elAll = document.getElementById('chip-count-all');
    const elAdmin = document.getElementById('chip-count-admin');
    const elUser = document.getElementById('chip-count-user');

    if (elAll) elAll.textContent = totalAll;
    if (elAdmin) elAdmin.textContent = totalAdmin;
    if (elUser) elUser.textContent = totalUser;
}

// --- RENDERIZADO (LISTADO) ---
function renderUsersList() {
    const container = document.getElementById('users-list');
    const tpl = document.getElementById('tpl-user-card');

    if (!container || !tpl) return;
    container.innerHTML = '';

    // Calcular Paginación
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
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
        const card = clone.querySelector('.customer-card, .user-card-item-stitch');

        // Info Básica
        const nameEl = card.querySelector('.card-name, .card-name-stitch');
        const emailEl = card.querySelector('.card-email, .card-email-stitch');
        if (nameEl) nameEl.textContent = u.name || 'Sin nombre';
        if (emailEl) emailEl.textContent = u.email || 'Sin email';

        // Badge ADMIN
        const badge = card.querySelector('.admin-badge');
        if (badge) {
            const isAdmin = u.rol === 'admin';
            badge.classList.toggle('hidden', !isAdmin);
        }

        // Avatar
        const avatarPlaceholder = card.querySelector('.card-avatar-placeholder');
        if (avatarPlaceholder) {
            avatarPlaceholder.innerHTML = getAvatarHtml(u, 'card-img avatar-img-small', 'avatar-init-small');
        }

        // Estado Activo UI
        if (selectedUser && selectedUser.id === u.id) {
            card.classList.add('active');
        }

        // Evento Click
        card.onclick = () => selectUser(u);

        container.appendChild(clone);
    });

    updatePaginationUI(totalPages);
}

function updatePaginationUI(totalPages) {
    const prevBtn = document.getElementById('list-prev');
    const nextBtn = document.getElementById('list-next');
    const numbersDiv = document.getElementById('list-page-numbers');

    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

    if (!numbersDiv) return;
    numbersDiv.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        if (i > 3 && i < totalPages) {
            if (i === 4) {
                const span = document.createElement('span');
                span.textContent = '...';
                numbersDiv.appendChild(span);
            }
            continue;
        }
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => {
            currentPage = i;
            renderUsersList();
        };
        numbersDiv.appendChild(btn);
    }
}

// --- SELECCIÓN Y FICHA (DETALLE) ---
function selectUser(user) {
    selectedUser = user;
    window.__selectUser = selectUser;

    // Persistir en URL y sessionStorage para que al refrescar se mantenga
    try {
        sessionStorage.setItem("admin_selected_user_id", user.id);
        const url = new URL(window.location.href);
        if (url.searchParams.get("id") !== user.id) {
            url.searchParams.set("id", user.id);
            window.history.replaceState({ userId: user.id }, "", url.toString());
        }
    } catch (e) {}

    // Actualizar título de móvil si existe
    const headerTitle = document.getElementById("header-customer-detail-title-text");
    if (headerTitle) headerTitle.textContent = "Detalle del usuario";

    // UI Feedback en Sidebar
    renderUsersList();

    // Mostrar Sección Detalle
    const detailSection = document.getElementById('user-detail');
    const emptyState = document.getElementById('no-selection');

    if (detailSection) detailSection.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    document.body.classList.add('detail-view-active');

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
    const roleBadge = document.getElementById('u-role-text');
    if (roleBadge) roleBadge.textContent = user.rol === 'admin' ? 'Administrador' : 'Usuario';

    document.getElementById('u-avatar-placeholder').innerHTML = getAvatarHtml(user, 'profile-img', 'avatar-init-large');

    // Estadísticas
    const regDate = new Date(user.created_at);
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    document.getElementById('u-reg-date-stat').textContent = `${months[regDate.getMonth()]} ${regDate.getFullYear()}`;

    // Panel de Seguridad
    const validRoles = ['user', 'admin'];
    const roleMap = { 'moderator': 'user', 'suspendido': 'user' };
    const normalizedRole = roleMap[user.rol] || (validRoles.includes(user.rol) ? user.rol : 'user');
    document.getElementById('u-role-select').value = normalizedRole;
    document.getElementById('u-phone-text').textContent = user.phone || 'No registrado';
    document.getElementById('u-address-text').textContent = finalAddress;
    document.getElementById('u-created-at').textContent = regDate.toLocaleDateString();

    // Estado Toggle
    const toggle = document.getElementById('u-status-toggle');
    const statusLabel = document.querySelector('.status-label-stitch');
    const isActive = user.status !== 'inactivo';
    if(toggle) toggle.checked = isActive;
    if(statusLabel) statusLabel.textContent = isActive ? "ACTIVO" : "INACTIVO";

    // Efecto Feedback en Móvil
    if (window.innerWidth <= 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function backToList() {
    document.body.classList.remove('detail-view-active');
    selectedUser = null;
    try {
        sessionStorage.removeItem("admin_selected_user_id");
        const url = new URL(window.location.href);
        url.searchParams.delete("id");
        window.history.replaceState({}, "", url.toString());
    } catch (e) {}
    renderUsersList();
}

// --- FILTROS Y BÚSQUEDA ---
function handleSearch(query) {
    const q = (query || "").toLowerCase();
    filteredUsers = allUsers.filter(u =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
    currentPage = 1;
    renderUsersList();
}

function handleFilter(role) {
    if (role === 'all' || role === 'todos') {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(u => u.rol === role);
    }
    currentPage = 1;

    // Sincronizar chips activos
    document.querySelectorAll('.users-filter-chips .customer-chip').forEach(c => {
        const val = c.dataset.filter;
        c.classList.toggle('active', val === role || (val === 'all' && (role === 'all' || role === 'todos')));
    });

    renderUsersList();
}

// --- ACCIONES DE SEGURIDAD ---
async function handleSaveChanges() {
    if (!selectedUser) return;

    const newRole = document.getElementById('u-role-select').value;
    const isActive = document.getElementById('u-status-toggle').checked;
    const newStatus = isActive ? 'activo' : 'inactivo';

    const ok = await showActionConfirm(`¿Deseas actualizar la configuración de <b>${selectedUser.name}</b>?`);
    if (!ok) return;

    try {
        const { error } = await _supabase
            .from('users')
            .update({
                rol: newRole,
                status: newStatus
            })
            .eq('id', selectedUser.id);

        if (error) throw error;

        showSnack("success", `Configuración de ${selectedUser.name} actualizada`);
        selectedUser.rol = newRole;
        selectedUser.status = newStatus;

        // Actualizar item local y re-renderizar
        const idx = allUsers.findIndex(u => u.id === selectedUser.id);
        if (idx !== -1) {
            allUsers[idx].rol = newRole;
            allUsers[idx].status = newStatus;
        }
        updateChipCounts();
        renderUsersList();
    } catch (err) {
        console.error("Error guardando cambios:", err);
        showSnack("error", "Error al actualizar usuario");
    }
}

async function handleResetPassword() {
    if (!selectedUser || !selectedUser.email) return;

    const ok = await showActionConfirm(`¿Enviar correo de restablecimiento de contraseña a <b>${selectedUser.email}</b>?`);
    if (!ok) return;

    try {
        const { error } = await _supabase.auth.resetPasswordForEmail(selectedUser.email, {
            redirectTo: window.location.origin + '/pages/auth/actualizar-password.html',
        });

        if (error) throw error;
        showSnack("success", "Correo de recuperación enviado con éxito");
    } catch (err) {
        console.error("Error enviando reset:", err);
        showSnack("error", "No se pudo enviar el correo de recuperación");
    }
}

// --- MODALES MULTICANAL ---
function openContactModal() {
    if (!selectedUser) return;
    const modal = document.getElementById('modal-contact');
    const nameSpan = document.getElementById('contact-user-name');

    if (nameSpan) nameSpan.textContent = selectedUser.name;
    if (modal) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add('active');
            });
        });
    }
}

function closeContactModal() {
    const modal = document.getElementById('modal-contact');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function handleWhatsApp() {
    if (!selectedUser || !selectedUser.phone) {
        showSnack("error", "El usuario no tiene un teléfono registrado");
        return;
    }
    const cleanPhone = selectedUser.phone.replace(/\D/g, '');
    const text = encodeURIComponent(`Hola ${selectedUser.name}, te contactamos desde el equipo de administración de Café Cortero.`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    closeContactModal();
}

function handleEmail() {
    if (!selectedUser || !selectedUser.email) return;
    const subject = encodeURIComponent("Comunicación de Seguridad - Café Cortero");
    window.location.href = `mailto:${selectedUser.email}?subject=${subject}`;
    closeContactModal();
}

function openPushModal() {
    closeContactModal();
    const modal = document.getElementById('modal-push');
    const nameSpan = document.getElementById('push-user-name');
    if (nameSpan) nameSpan.textContent = selectedUser.name;
    if (modal) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
    }
}

function closePushModal() {
    const modal = document.getElementById('modal-push');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function handleSendPush() {
    const title = document.getElementById('push-title').value.trim();
    const msg = document.getElementById('push-message').value.trim();

    if (!title || !msg) {
        showSnack("error", "Completa el título y el mensaje");
        return;
    }

    showSnack("success", "Alerta push encolada para envío");
    closePushModal();
    document.getElementById('push-title').value = '';
    document.getElementById('push-message').value = '';
}

// --- CONFIRM SNACKBAR PROMISE ---
function showActionConfirm(htmlMessage) {
    return new Promise((resolve) => {
        const snack = document.getElementById('confirm-snackbar');
        const text = document.getElementById('confirm-text');
        const btnOk = document.getElementById('btn-confirm-ok');
        const btnCancel = document.getElementById('btn-confirm-cancel');

        if (!snack || !text || !btnOk || !btnCancel) {
            resolve(window.confirm(htmlMessage.replace(/<[^>]*>?/gm, '')));
            return;
        }

        text.innerHTML = htmlMessage;
        snack.classList.remove('hidden');
        requestAnimationFrame(() => snack.classList.add('active'));

        const cleanup = () => {
            snack.classList.remove('active');
            setTimeout(() => snack.classList.add('hidden'), 300);
            btnOk.removeEventListener('click', onOk);
            btnCancel.removeEventListener('click', onCancel);
        };

        const onOk = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };

        btnOk.addEventListener('click', onOk);
        btnCancel.addEventListener('click', onCancel);
    });
}

function showSnack(type, message) {
    const snackbar = document.getElementById("snackbar");
    if (!snackbar) return;
    snackbar.textContent = message;
    snackbar.className = `snackbar show ${type}`;
    setTimeout(() => { snackbar.className = snackbar.className.replace("show", ""); }, 3500);
}

// --- HELPER AVATARES ---
function getAvatarHtml(user, imgClass, initClass) {
    if (user.avatar_url || user.photo_url) {
        return `<img src="${user.avatar_url || user.photo_url}" class="${imgClass}" alt="${user.name}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'${initClass}\\'>${getInitials(user.name)}</div>'" />`;
    }
    return `<div class="${initClass}">${getInitials(user.name)}</div>`;
}

function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}
