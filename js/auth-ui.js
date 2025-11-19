// =====================================================
// AUTH UI — Header + Drawer + Perfil (GLOBAL)
// =====================================================

const supabase = window.supabaseClient;
const { getCurrentUser, logoutUser } = window.supabaseAuth;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await getCurrentUser();
  if (!user) return showLoggedOutUI();
  updateUIForUser(user);
});

// --------------------------
// No logueado
// --------------------------
function showLoggedOutUI() {
  document.getElementById("login-desktop").style.display = "inline-block";
  document.getElementById("profile-desktop").style.display = "none";

  document.getElementById("drawer-links-default").style.display = "flex";
  document.getElementById("drawer-links-logged").style.display = "none";
}

// --------------------------
// Logueado
// --------------------------
function updateUIForUser(user) {
  const name = user.user_metadata?.full_name || "Usuario";
  const photo = user.user_metadata?.photo_url || "imagenes/avatar-default.svg";

  // Desktop
  document.getElementById("login-desktop").style.display = "none";
  const desktopProfile = document.getElementById("profile-desktop");
  desktopProfile.style.display = "flex";

  document.getElementById("profile-photo-desktop").src = photo;
  document.getElementById("hello-desktop").textContent = `Hola, ${name}`;

  desktopProfile.onclick = () => {
    document.getElementById("profile-menu").classList.toggle("open");
  };

  document.addEventListener("click", (e) => {
    if (!desktopProfile.contains(e.target)) {
      document.getElementById("profile-menu").classList.remove("open");
    }
  });

  // Móvil
  document.getElementById("drawer-links-default").style.display = "none";
  document.getElementById("drawer-links-logged").style.display = "flex";

  document.getElementById("profile-photo-mobile").src = photo;
  document.getElementById("hello-mobile").textContent = `Hola, ${name}`;

  document.getElementById("logout-desktop").onclick = logoutAndReload;
  document.getElementById("logout-mobile").onclick = logoutAndReload;
}

// --------------------------
async function logoutAndReload(e) {
  e.preventDefault();
  await logoutUser();
  window.location.reload();
}

console.log("👤 auth-ui.js cargado en modo GLOBAL");
