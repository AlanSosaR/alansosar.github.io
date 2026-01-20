// =====================================================
// LAYOUT — HEADER GLOBAL (CORE FINAL SIN LOOP)
// =====================================================

console.log("📐 layout.js cargado");

/*
  REGLAS:
  - layout.js SOLO inyecta header
  - NO decide auth
  - NO toca sesión
  - NO toca lógica de usuario
  - NO se ejecuta en login.html
*/

// =====================================================
// 1️⃣ BLOQUEO ABSOLUTO EN LOGIN
// =====================================================
if (document.body.dataset.page === "login") {
  console.warn("⛔ layout.js deshabilitado (página login)");
} else {

  // =====================================================
  // 2️⃣ GUARD GLOBAL — EVITA DOBLE EJECUCIÓN
  // =====================================================
  if (window.__LAYOUT_LOADED__) {
    console.warn("⚠️ layout.js ya ejecutado, abortando");
  } else {
    window.__LAYOUT_LOADED__ = true;

// =====================================================
// 3️⃣ DOM READY
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {

  // 🔒 Si el header ya existe, no volver a inyectar
  if (document.getElementById("main-header")) {
    console.warn("⚠️ Header ya existe en DOM, no se inyecta");
    return;
  }

  try {
    console.log("📦 layout.js: cargando header.html");

    const HEADER_PATH =
      window.PAGE_MODE?.startsWith("admin")
        ? "../../header.html"   // ADMIN (pages/admin/*)
        : "header.html";        // CLIENTE / PÚBLICO

    const res = await fetch(HEADER_PATH, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`header.html no encontrado (${HEADER_PATH})`);
    }

    const html = await res.text();

    // Inyectar header
    document.body.insertAdjacentHTML("afterbegin", html);
    console.log("✅ Header inyectado");

  } catch (err) {
    console.error("❌ Error en layout.js:", err);
  }
});

        // =====================================================
        // 4️⃣ INYECTAR HEADER (UNA SOLA VEZ)
        // =====================================================
        document.body.insertAdjacentHTML("afterbegin", html);
        console.log("✅ Header inyectado");

        // =====================================================
        // 4.1️⃣ HEADER — TÍTULO CENTRAL SEGÚN PÁGINA
        // =====================================================

        // Ocultar TODOS los títulos primero
        document.querySelectorAll(".header-cart-title").forEach(el => {
          el.classList.add("hidden");
        });

        // =====================================================
// MOSTRAR SOLO EL TÍTULO CORRESPONDIENTE (HEADER)
// =====================================================

// 🛒 Carrito
if (document.body.classList.contains("page-carrito")) {
  document.getElementById("header-cart-title")?.classList.remove("hidden");
}

// 👤 Datos del cliente
if (document.body.classList.contains("page-datos-cliente")) {
  document.getElementById("header-datos-title")?.classList.remove("hidden");
}

// 🧾 Recibo
if (document.body.classList.contains("page-recibo")) {
  document.getElementById("header-recibo-title")?.classList.remove("hidden");
}

// 📦 Mis pedidos
if (document.body.classList.contains("page-mis-pedidos")) {
  document.getElementById("header-mis-pedidos-title")?.classList.remove("hidden");
}

// ☕ ADMIN — LISTADO DE CAFÉS
if (document.body.classList.contains("page-admin-cafes")) {
  document.getElementById("header-admin-cafes-title")?.classList.remove("hidden");
}

// ☕➕ ADMIN — AGREGAR / EDITAR CAFÉ
if (document.body.classList.contains("page-admin-agregar-cafe")) {
  const params = new URLSearchParams(window.location.search);

  if (params.get("id")) {
    // ✏️ Editar café
    document
      .getElementById("header-admin-edit-cafe-title")
      ?.classList.remove("hidden");
  } else {
    // ➕ Agregar café
    document
      .getElementById("header-admin-add-cafe-title")
      ?.classList.remove("hidden");
  }
}
        // =====================================================
        // 5️⃣ INIT HEADER (UI PURA)
        // =====================================================
        if (typeof window.initHeader === "function") {
          window.initHeader();
          console.log("🧭 initHeader OK");
        } else {
          console.warn("⚠️ initHeader no existe");
        }

        // =====================================================
        // 6️⃣ INIT AUTH UI (SOLO VISIBILIDAD logged / no-user)
        // =====================================================
        if (typeof window.initAuthUI === "function") {
          await window.initAuthUI();
          console.log("🔐 initAuthUI OK");
        } else {
          console.warn("⚠️ initAuthUI no existe");
        }

        // =====================================================
        // 7️⃣ HEADER LISTO — NOTIFICAR AL RESTO DE LA APP
        // =====================================================
        document.dispatchEvent(new Event("header:ready"));
        console.log("📣 Evento header:ready disparado");

      } catch (err) {
        console.error("❌ Error en layout.js:", err);
      }
    });
  }
}
