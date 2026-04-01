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
let filteredUsers = [];
let currentSearch = "";
let currentRole = "all";

// Paginación
let currentPage = 1;
const itemsPerPage = 5;

async function fetchUsers() {
    const loadingElem = document.getElementById('loading-users');
    
    try {
        loadingElem.classList.remove('hidden');
        
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
        loadingElem.classList.add('hidden');
    }
}

function applyFilters() {
    currentPage = 1; // Reiniciar al filtrar
    
    filteredUsers = allUsers.filter(u => {
        const matchesSearch = !currentSearch || 
            u.name?.toLowerCase().includes(currentSearch) || 
            u.email?.toLowerCase().includes(currentSearch);
        
        const matchesRole = currentRole === "all" || u.rol === currentRole;

        return matchesSearch && matchesRole;
    });

    renderCurrentPage();
}

function renderCurrentPage() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredUsers.slice(startIndex, endIndex);

    renderUsers(pageItems);
    updatePaginationUI();
}

function updatePaginationUI() {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const pageNumbers = document.getElementById('page-numbers');

    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages);
    if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;

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

function setupInteractions() {
    // --- EVENTOS GLOBALES ---
    document.addEventListener('user:search', (e) => {
        currentSearch = e.detail?.toLowerCase().trim() || "";
        applyFilters();
    });

    document.addEventListener('user:filter', (e) => {
        currentRole = e.detail || "all";
        applyFilters();
    });

    // --- CONTROLES DE PAGINACIÓN ---
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

// Global scope for HTML onclicks
window.openUserMenu = (userId) => {
    console.log("🛠️ Gestión de usuario ID:", userId);
    // Aquí abriríamos el modal de Stitch para cambiar rol o suspender
    alert("Función de edición de rol en desarrollo. ID: " + userId);
};
