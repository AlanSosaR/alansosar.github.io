/**
 * LÓGICA DEL PANEL ADMIN DE WHATSAPP (Evolution API)
 * Archivo: js/admin/admin-whatsapp.js
 * Función: Conecta la UI administrativa con el motor local en el puerto 8080
 */

document.addEventListener("DOMContentLoaded", () => {

  // --- CONFIGURACIÓN EVOLUTION API ---
  const API_URL = "https://132.145.42.123:8080";
  const INSTANCE_NAME = "CafeCortero";
  const GLOBAL_API_KEY = "429683C4C977415CAAFCCE10F7D57E11"; // Definido en tu `.env`
  
  // --- ELEMENTOS DEL DOM ---
  const statusCard = document.getElementById("whatsapp-status-card");
  const statusIcon = document.getElementById("status-icon");
  const statusTitle = document.getElementById("status-title");
  const statusMessage = document.getElementById("status-message");
  
  const qrContainer = document.getElementById("qr-container");
  const qrImage = document.getElementById("qr-image");
  
  const btnDisconnect = document.getElementById("btn-disconnect");
  const btnRetry = document.getElementById("btn-retry");
  const snackbar = document.getElementById("snackbar");

  let pollingInterval = null;

  /* ==========================================================
     INICIALIZACIÓN Y SEGURIDAD
  ========================================================== */
  async function initWhatsAppAdmin() {
    // 1. Validar que el usuario sea Admin
    const user = JSON.parse(localStorage.getItem("cortero_user"));
    if (!user || user.rol !== "admin") {
      window.location.href = "/pages/auth/login.html";
      return;
    }

    // 2. Revisar el estado de la conexión en la API
    await checkConnectionState();
  }

  /* ==========================================================
     UI HELPERS
  ========================================================== */
  function showToast(message, isError = false) {
    if (!snackbar) return;
    snackbar.textContent = message;
    snackbar.className = `snackbar show ${isError ? "error" : "success"}`;
    setTimeout(() => { snackbar.className = snackbar.className.replace("show", ""); }, 3000);
  }

  function setStatus(state, message = "") {
    // Limpiar clases previas
    statusCard.classList.remove("state-connected", "state-disconnected");
    qrContainer.classList.add("hidden");
    btnDisconnect.classList.add("hidden");
    btnRetry.classList.add("hidden");

    if (state === "LOADING") {
      statusIcon.textContent = "hourglass_empty";
      statusIcon.style.color = "#F9A825";
      statusTitle.textContent = "Cargando código QR...";
      statusMessage.textContent = message || "Conectando con Evolution API...";
    } 
    else if (state === "QR") {
      statusIcon.textContent = "qr_code_scanner";
      statusIcon.style.color = "#377b4c";
      statusTitle.textContent = "Escanea el Código QR";
      statusMessage.textContent = message || "Apunta la cámara de WhatsApp para vincular el número de tu tienda.";
      qrContainer.classList.remove("hidden");
    } 
    else if (state === "CONNECTED") {
      statusCard.classList.add("state-connected");
      statusIcon.textContent = "check_circle";
      statusTitle.textContent = "¡WhatsApp Conectado!";
      statusMessage.textContent = "Café Cortero está listo para enviar notificaciones automáticas.";
      btnDisconnect.classList.remove("hidden");
      stopPolling();
    } 
    else if (state === "ERROR" || state === "DISCONNECTED") {
      statusCard.classList.add("state-disconnected");
      statusIcon.textContent = "error";
      statusTitle.textContent = "Desconectado";
      statusMessage.textContent = message || "Hubo un error al intentar comunicar con el servidor de mensajería.";
      btnRetry.classList.remove("hidden");
      stopPolling();
    }
  }

  /* ==========================================================
     PETICIONES HTTP A EVOLUTION API (Fetch)
  ========================================================== */
  
  // Opciones base para Fetch
  const fetchOptions = (method, body = null) => {
    const opts = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "apikey": GLOBAL_API_KEY
      }
    };
    if (body) opts.body = JSON.stringify(body);
    return opts;
  };

  /**
   * Revisar el estado actual de la sesión
   */
  async function checkConnectionState() {
    try {
      const response = await fetch(`${API_URL}/instance/connectionState/${INSTANCE_NAME}`, fetchOptions("GET"));
      
      if (response.status === 404) {
        // La instancia no existe aún, procedemos a crearla
        await createInstance();
        return;
      }
      
      if (!response.ok) throw new Error("No se pudo obtener el estado.");
      
      const data = await response.json();
      const state = data?.instance?.state || "close";

      if (state === "open") {
        setStatus("CONNECTED");
      } else if (state === "connecting") {
        // Si está conectando, pedimos el nuevo QR explícitamente y lanzamos el polling
        await requestQR();
      } else {
        // close / refuse / timeout
        await requestQR();
      }

    } catch (error) {
      console.error("Error Evolution API:", error);
      setStatus("ERROR", "No se puede conectar al servidor en puerto 8080. Contacta al administrador.");
    }
  }

  /**
   * Crear la instancia en la API por primera vez
   */
  async function createInstance() {
    try {
      setStatus("LOADING", "Creando instancia de Café Cortero en el servidor...");
      const payload = {
        instanceName: INSTANCE_NAME,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      };

      const response = await fetch(`${API_URL}/instance/create`, fetchOptions("POST", payload));
      const data = await response.json();

      if (data.qrcode && data.qrcode.base64) {
        renderQR(data.qrcode.base64);
        startPolling();
      } else {
        setStatus("ERROR", "Instancia creada, pero no devolvió QR. Intenta Reintentar Conexión.");
      }
    } catch (error) {
      console.error(error);
      setStatus("ERROR", "Fallo al crear la instancia en el servidor remoto.");
    }
  }

  /**
   * Pedir código QR (cuando la instancia ya existe pero está desconectada)
   */
  async function requestQR() {
    try {
      setStatus("LOADING", "Generando código QR desde WhatsApp...");
      const response = await fetch(`${API_URL}/instance/connect/${INSTANCE_NAME}`, fetchOptions("GET"));
      
      if (response.ok) {
        const data = await response.json();
        if (data.base64) {
          renderQR(data.base64);
          startPolling();
          return;
        } else if (data.instance && data.instance.state === "open") {
          setStatus("CONNECTED");
          return;
        }
      } else if (response.status === 400 || response.status === 403) {
           // Instancia ya está conectada u otro impedimento
           await checkConnectionState();
           return;
      }
      
      throw new Error("No se pudo extraer QR.");
    } catch (error) {
      console.error(error);
      setStatus("ERROR", "Fallo al obtener el Código QR. El servicio podría estar saturado.");
    }
  }

  /**
   * Renderiza la imagen Base64 del código QR en el DOM
   */
  function renderQR(base64String) {
    // En evolution API V2, el base64 viene crudo si se extrae de cierto endpoint,
    // o ya viene con data:image/png;base64, ...
    qrImage.src = base64String.startsWith("data:image") ? base64String : base64String;
    setStatus("QR");
  }

  /**
   * Desconectar la instancia actual
   */
  async function disconnectWhatsApp() {
    try {
      const confirmacion = confirm("¿Estás seguro que deseas deshabilitar los envíos automáticos desde este número?");
      if (!confirmacion) return;

      setStatus("LOADING", "Cerrando la sesión de WhatsApp remota...");
      const response = await fetch(`${API_URL}/instance/logout/${INSTANCE_NAME}`, fetchOptions("DELETE"));
      
      if (response.ok) {
        showToast("Sesión cerrada correctamente.");
        await checkConnectionState(); // Va a pedir QR de nuevo
      } else {
        throw new Error("No se pudo cerrar sesión");
      }
    } catch (error) {
      console.error(error);
      showToast("Error al intentar desvincular el dispositivo.", true);
      setStatus("CONNECTED"); // Regresamos estado
    }
  }

  /* ==========================================================
     VERIFICACIÓN CONSTANTE (POLLING)
  ========================================================== */
  
  function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    // Revisar la conexión cada 4 segundos
    pollingInterval = setInterval(async () => {
      try {
         const resp = await fetch(`${API_URL}/instance/connectionState/${INSTANCE_NAME}`, fetchOptions("GET"));
         if (resp.ok) {
           const data = await resp.json();
           if (data?.instance?.state === "open") {
             setStatus("CONNECTED");
             // Opcional: Recargar o mostrar toast exitoso
             showToast("¡Viculación completada de forma impecable!");
           }
         }
      } catch (e) {
         console.warn("Polling omitido", e);
      }
    }, 4000);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  /* ==========================================================
     ASIGNACIÓN DE EVENTOS 
  ========================================================== */
  btnRetry.addEventListener("click", () => {
    checkConnectionState();
  });

  btnDisconnect.addEventListener("click", () => {
    disconnectWhatsApp();
  });

  // Limpieza al cambiar de pestaña
  window.addEventListener("beforeunload", stopPolling);

  // ARRANCAR
  initWhatsAppAdmin();

});
