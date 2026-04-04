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
    document.getElementById('btn-back-to-list')?.addEventListener('click', () => {
        document.body.classList.remove('detail-view-active');
        selectedUser = null;
        renderUsersList();
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
        
        renderUsersList();
    } catch (err) {
        console.error("Error cargando usuarios:", err);
        showSnack("error", "Error al conectar con el servidor");
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
    document.getElementById('u-avatar-placeholder').innerHTML = getAvatarHtml(user, 'avatar-img-large', 'avatar-init-large');
    
    // Estadísticas
    const regDate = new Date(user.created_at);
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    document.getElementById('u-reg-date-stat').textContent = `${months[regDate.getMonth()]} ${regDate.getFullYear()}`;
    
    // Panel de Seguridad — normalizar rol a las 2 opciones válidas
    const validRoles = ['user', 'admin'];
    const roleMap = { 'moderator': 'user', 'suspendido': 'user' }; // migrar roles legacy
    const normalizedRole = roleMap[user.rol] || (validRoles.includes(user.rol) ? user.rol : 'user');
    document.getElementById('u-role-select').value = normalizedRole;
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

function backToList() {
    document.body.classList.remove('detail-view-active');
    selectedUser = null;
    renderUsersList();
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
        showSnack("error", "Error al actualizar la configuración");
    }
}

async function handleResetPassword() {
    if (!selectedUser) return;

    const ok = await showActionConfirm(`¿Enviar enlace de recuperación a <b>${selectedUser.email}</b>?`);
    if (!ok) return;
    
    try {
        const redirectTo = `${window.location.origin}/pages/auth/new-password.html`;
        const { error } = await _supabase.auth.resetPasswordForEmail(selectedUser.email, {
            redirectTo: redirectTo
        });

        if (error) {
            console.error(error);
            showSnack("error", "Error al enviar el enlace");
            return;
        }

        showSnack("success", "Enlace de recuperación enviado con éxito");
    } catch (err) {
        console.error("Excepción en handleResetPassword:", err);
        showSnack("error", "Ocurrió un error inesperado");
    }
}

// --- LÓGICA DE CONTACTO MULTICANAL ---

function openContactModal() {
    if (!selectedUser) return;
    const modal = document.getElementById('modal-contact');
    const nameSpan = document.getElementById('contact-user-name');
    
    if (nameSpan) nameSpan.textContent = selectedUser.name;
    if (modal) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
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
    // Limpiar número (solo dígitos)
    const cleanPhone = selectedUser.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${selectedUser.name}, te contactamos desde la administración de Café Cortero.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
}

function handleEmail() {
    if (!selectedUser || !selectedUser.email) return;
    const subject = encodeURIComponent("Contacto Administrativo — Café Cortero");
    window.open(`mailto:${selectedUser.email}?subject=${subject}`, "_blank");
}

function openPushModal() {
    closeContactModal();
    const modal = document.getElementById('modal-push');
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

async function handleSendPush() {
    if (!selectedUser) return;
    
    const title = document.getElementById('push-title').value.trim();
    const message = document.getElementById('push-message').value.trim();
    
    if (!title || !message) {
        showSnack("error", "Por favor, completa el título y el mensaje");
        return;
    }

    try {
        // Registrar notificación en la BD (Mecanismo Serverless enviará el Push real)
        const { error } = await _supabase
            .from('notifications')
            .insert([{
                user_id: selectedUser.id,
                title: title,
                message: message,
                type: 'admin_push',
                is_read: false,
                push_sent: false
            }]);

        if (error) throw error;

        showSnack("success", `Notificación push enviada a ${selectedUser.name}`);
        closePushModal();
        
        // Limpiar campos
        document.getElementById('push-title').value = '';
        document.getElementById('push-message').value = '';
        
    } catch (err) {
        console.error("Error enviando push:", err);
        showSnack("error", "No se pudo enviar la notificación");
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
    const map = { 'admin': 'ADMIN', 'user': 'USUARIO' };
    return map[role] || 'USUARIO';
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

/* =========================
   CONFIRMATION BOX LOGIC (STITCH)
========================= */
function showActionConfirm(text) {
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
}

function showSnack(type, text) {
    const snackbar = document.getElementById("admin-snackbar");
    const icon = document.getElementById("snack-icon");
    const label = document.getElementById("snack-text");

    if (!snackbar || !label || !icon) return;

    label.textContent = text;
    icon.textContent = type === "success" ? "check_circle" : type === "error" ? "error" : "info";
    snackbar.className = `snackbar active ${type}`;
    
    setTimeout(() => snackbar.classList.remove("active"), 3000);
}
