document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "https://cafe-cortero.vercel.app/api/wa-proxy";
  const INSTANCE = "CafeCortero";
  const API_KEY = "429683C4C977415CAAFCCE10F7D57E11";

  const user = JSON.parse(localStorage.getItem("cortero_user"));
  if (!user || user.rol !== "admin") {
    window.location.href = "/pages/auth/login.html";
    return;
  }

  let allContacts = [];
  let filteredContacts = [];
  let selectedContact = null;
  let messagesRefreshTimer = null;
  let notificationPollTimer = null;
  let lastSeenTs = Math.floor(Date.now() / 1000);
  const sentMessages = {};
  const notifiedMessages = new Set();

  // Request notification permission on load
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  const contactsList = document.getElementById("contacts-list");
  const contactsCount = document.getElementById("contacts-count");
  const searchInput = document.getElementById("wa-search");
  const panel = document.getElementById("wa-panel");
  const noSelection = document.getElementById("wa-no-selection");
  const chat = document.getElementById("wa-chat");
  const chatName = document.getElementById("chat-name");
  const chatPhone = document.getElementById("chat-phone");
  const chatHistory = document.getElementById("chat-history");
  const messageInput = document.getElementById("wa-message-input");
  const sendBtn = document.getElementById("wa-send-btn");
  const attachBtn = document.getElementById("wa-attach-btn");
  const fileInput = document.getElementById("wa-file-input");
  const previewArea = document.getElementById("wa-image-preview");
  const previewImg = document.getElementById("wa-preview-img");
  const previewCancel = document.getElementById("wa-preview-cancel");

  let pendingImage = null; // { base64, name }

  /* =========================
     IMAGE ATTACH
  ========================= */
  attachBtn?.addEventListener("click", () => fileInput?.click());

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showSnack("Solo imágenes", "error"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      pendingImage = { base64: ev.target.result, name: file.name };
      previewImg.src = ev.target.result;
      previewArea.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
    fileInput.value = "";
  });

  previewCancel?.addEventListener("click", () => {
    pendingImage = null;
    previewArea.classList.add("hidden");
    previewImg.src = "";
  });

  /* =========================
     INJECT GEAR INTO HEADER
  ========================= */
   function injectGear() {
    const headerRight = document.querySelector(".header-right-stitch");
    if (!headerRight || document.getElementById("wa-settings-btn")) return;

    const authGroup = document.querySelector(".header-auth-group");

    const wrapper = document.createElement("div");
    wrapper.className = "wa-header-gear";
    wrapper.style.position = "relative";
    wrapper.innerHTML = `
      <button id="wa-settings-btn" class="header-icon-btn" title="WhatsApp" style="position:relative;">
        <span class="material-symbols-outlined">settings</span>
        <span id="wa-dot" class="wa-dot" style="
          position:absolute; top:2px; right:2px; width:8px; height:8px;
          border-radius:50%; background:#2e7d32;
        "></span>
      </button>
      <div id="wa-settings-dropdown" class="wa-settings-dropdown hidden">
        <div id="wa-dropdown-status" class="wa-dropdown-status">
          <span class="material-symbols-outlined" id="dropdown-status-icon" style="font-size:18px;color:#2e7d32">check_circle</span>
          <span id="dropdown-status-text">Conectado</span>
        </div>
        <hr class="wa-dropdown-divider">
        <button id="wa-disconnect-btn" class="wa-dropdown-item danger hidden">
          <span class="material-symbols-outlined">link_off</span> Desconectar WhatsApp
        </button>
        <button id="wa-connect-btn" class="wa-dropdown-item hidden">
          <span class="material-symbols-outlined">qr_code_scanner</span> Escanear QR
        </button>
        <div id="wa-qr-section" class="wa-qr-section hidden">
          <div class="wa-qr-image-wrapper">
            <img id="wa-qr-image" src="" alt="QR" />
          </div>
          <div class="wa-qr-status" id="wa-qr-status">Esperando escaneo...</div>
          <button id="wa-qr-cancel" class="wa-dropdown-item">
            <span class="material-symbols-outlined">arrow_back</span> Volver
          </button>
        </div>
      </div>
    `;

    if (window.innerWidth < 768) {
      const logoLink = document.querySelector(".header-logo-link");
      headerRight.appendChild(wrapper);
      if (logoLink) {
        headerRight.appendChild(logoLink);
        logoLink.style.display = "flex";
        logoLink.style.alignItems = "center";
      }
    } else if (authGroup) {
      headerRight.insertBefore(wrapper, authGroup);
    } else {
      headerRight.appendChild(wrapper);
    }
    bindGearEvents();
    updateStatus();
    setInterval(updateStatus, 10000);
    loadContacts();
  }

  /* =========================
     GEAR EVENTS
  ========================= */
  function bindGearEvents() {
    const settingsBtn = document.getElementById("wa-settings-btn");
    const settingsDropdown = document.getElementById("wa-settings-dropdown");
    const disconnectBtn = document.getElementById("wa-disconnect-btn");
    const connectBtn = document.getElementById("wa-connect-btn");

    settingsBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      settingsDropdown?.classList.toggle("hidden");
      if (settingsDropdown?.classList.contains("hidden")) cancelQR();
      else updateStatus();
    });

    document.addEventListener("click", () => {
      if (!settingsDropdown?.classList.contains("hidden")) cancelQR();
      settingsDropdown?.classList.add("hidden");
    });

    settingsDropdown?.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    disconnectBtn?.addEventListener("click", async () => {
      settingsDropdown?.classList.add("hidden");
      const confirmed = await showConfirmSnack("¿Desconectar WhatsApp de la instancia CafeCortero? Los clientes no recibirán notificaciones hasta que reconectes.");
      if (!confirmed) return;

      try {
        await fetch(`${API_URL}/instance/logout/${INSTANCE}`, {
          method: "DELETE", headers: { apikey: API_KEY }
        });
      } catch (_) {}
      try {
        await fetch(`${API_URL}/instance/restart/${INSTANCE}`, {
          method: "GET", headers: { apikey: API_KEY }
        });
      } catch (_) {}

      resetWhatsAppState();
      await updateStatus();
      showSnack("WhatsApp desconectado", "success");
    });

    connectBtn?.addEventListener("click", () => {
      connectShowQR();
    });

    document.getElementById("wa-qr-cancel")?.addEventListener("click", () => {
      cancelQR();
    });
  }

  /* =========================
     CONFIRM SNACK
  ========================= */
  function showConfirmSnack(text) {
    return new Promise((resolve) => {
      const bar = document.getElementById("snackbar");
      if (!bar) { resolve(true); return; }
      bar.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;width:100%;">
          <span class="snack-text">${text}</span>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button id="snack-cancel-disconnect"
              style="background:none;border:none;color:#fff;font-weight:600;cursor:pointer;padding:8px 16px;">
              Cancelar
            </button>
            <button id="snack-confirm-disconnect"
              style="background:#c62828;border:none;color:#fff;font-weight:600;
                     cursor:pointer;padding:8px 16px;border-radius:8px;">
              Desconectar
            </button>
          </div>
        </div>`;
      bar.className = "snackbar show";
      document.getElementById("snack-cancel-disconnect").onclick = () => {
        bar.className = "snackbar";
        resolve(false);
      };
      document.getElementById("snack-confirm-disconnect").onclick = () => {
        bar.className = "snackbar";
        resolve(true);
      };
    });
  }

  /* =========================
     RESET STATE
  ========================= */
  function resetWhatsAppState() {
    allContacts = [];
    filteredContacts = [];
    if (messagesRefreshTimer) {
      clearInterval(messagesRefreshTimer);
      messagesRefreshTimer = null;
    }
    selectedContact = null;
    cachedApiMessages = {};
    Object.keys(sentMessages).forEach(k => delete sentMessages[k]);
    notifiedMessages.clear();
    lastSeenTs = Math.floor(Date.now() / 1000);

    if (contactsList) contactsList.innerHTML = '<div class="wa-loading">Sesión cerrada. Escanea el QR para conectar.</div>';
    if (contactsCount) contactsCount.textContent = "0 contactos";
    if (chat) chat.classList.add("hidden");
    if (noSelection) noSelection.classList.remove("hidden");
    if (chatName) chatName.textContent = "";
    if (chatPhone) chatPhone.textContent = "";
    if (chatHistory) chatHistory.innerHTML = "";

    // Forzar actualizacion del buscador
    if (searchInput) { searchInput.value = ""; }
    // Limpiar entrada de mensaje
    if (messageInput) messageInput.value = "";
    if (previewArea) previewArea.classList.add("hidden");
    pendingImage = null;
  }

  /* =========================
     QR IN DROPDOWN
  ========================= */
  let qrPollTimer = null;

  async function connectShowQR() {
    const dropdown = document.getElementById("wa-settings-dropdown");
    const qrSection = document.getElementById("wa-qr-section");
    const qrImg = document.getElementById("wa-qr-image");
    const qrStatus = document.getElementById("wa-qr-status");
    const disconnectBtn = document.getElementById("wa-disconnect-btn");
    const connectBtn = document.getElementById("wa-connect-btn");
    if (!qrSection || !qrImg || !qrStatus) return;

    disconnectBtn?.classList.add("hidden");
    connectBtn?.classList.add("hidden");
    qrSection.classList.remove("hidden");
    qrImg.src = "";
    qrStatus.textContent = "Reiniciando instancia...";

    // Reiniciar la instancia para garantizar un QR fresco
    try {
      await fetch(`${API_URL}/instance/restart/${INSTANCE}`, {
        method: "GET", headers: { apikey: API_KEY }
      });
    } catch (_) {}
    await new Promise(r => setTimeout(r, 2000));

    qrStatus.textContent = "Obteniendo código QR...";

    try {
      let data;
      // Intentar con GET primero
      let resp = await fetch(`${API_URL}/instance/connect/${INSTANCE}`, {
        method: "GET", headers: { apikey: API_KEY }
      });
      if (!resp.ok) {
        // Reintentar con POST
        resp = await fetch(`${API_URL}/instance/connect/${INSTANCE}`, {
          method: "POST", headers: { "Content-Type": "application/json", apikey: API_KEY },
          body: "{}"
        });
      }
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      data = await resp.json();

      if (data.base64) {
        qrImg.src = data.base64;
        qrStatus.textContent = "Escanea el código con tu WhatsApp";
      } else {
        throw new Error("No se recibió QR");
      }

      if (qrPollTimer) clearInterval(qrPollTimer);
      qrPollTimer = setInterval(async () => {
        try {
          const sr = await fetch(`${API_URL}/instance/connectionState/${INSTANCE}`, {
            method: "GET", headers: { "Content-Type": "application/json", apikey: API_KEY }
          });
          if (!sr.ok) return;
          const sd = await sr.json();
          const state = sd?.instance?.state;
          if (state === "open") {
            qrStatus.textContent = "✅ ¡Conectado!";
            qrStatus.style.color = "#2e7d32";
            setTimeout(() => { cancelQR(); updateStatus(); loadContacts(); }, 1200);
          } else if (state === "connecting") {
            qrStatus.textContent = "Conectando... espera";
            qrStatus.style.color = "#f9a825";
          } else if (state === "close") {
            qrStatus.textContent = "Escanéalo con tu WhatsApp";
            qrStatus.style.color = "#f9a825";
          }
        } catch (_) {}
      }, 3000);
    } catch (err) {
      console.error(err);
      qrStatus.textContent = "Error al obtener QR. Intenta de nuevo.";
      qrStatus.style.color = "#c62828";
    }
  }

  function cancelQR() {
    if (qrPollTimer) { clearInterval(qrPollTimer); qrPollTimer = null; }
    document.getElementById("wa-qr-section")?.classList.add("hidden");
    updateStatus();
  }

  /* =========================
     STATUS
  ========================= */
  async function updateStatus() {
    const statusIcon = document.getElementById("dropdown-status-icon");
    const statusText = document.getElementById("dropdown-status-text");
    const disconnectBtn = document.getElementById("wa-disconnect-btn");
    const connectBtn = document.getElementById("wa-connect-btn");
    const waDot = document.getElementById("wa-dot");
    if (!statusText) return;

    const qrSection = document.getElementById("wa-qr-section");
    const isQR = qrSection && !qrSection.classList.contains("hidden");

    try {
      const resp = await fetch(`${API_URL}/instance/connectionState/${INSTANCE}`, {
        method: "GET", headers: { "Content-Type": "application/json", apikey: API_KEY }
      });
      if (!resp.ok) throw new Error("No response");
      const data = await resp.json();
      const state = data?.instance?.state;
      if (state === "open") {
        statusIcon.textContent = "check_circle";
        statusIcon.style.color = "#2e7d32";
        statusText.textContent = "Conectado";
        if (!isQR) {
          disconnectBtn?.classList.remove("hidden");
          connectBtn?.classList.add("hidden");
        }
        if (waDot) waDot.style.background = "#2e7d32";
      } else if (state === "connecting") {
        statusIcon.textContent = "hourglass_empty";
        statusIcon.style.color = "#f9a825";
        statusText.textContent = "Conectándose...";
        if (!isQR && qrSection && !qrSection.closest(".hidden")) {
          disconnectBtn?.classList.add("hidden");
          connectBtn?.classList.add("hidden");
          connectShowQR();
        } else if (!isQR) {
          disconnectBtn?.classList.add("hidden");
          connectBtn?.classList.remove("hidden");
        }
        if (waDot) waDot.style.background = "#f9a825";
      } else {
        statusIcon.textContent = "error";
        statusIcon.style.color = "#c62828";
        statusText.textContent = "Desconectado";
        if (!isQR) {
          disconnectBtn?.classList.add("hidden");
          connectBtn?.classList.remove("hidden");
        }
        if (waDot) waDot.style.background = "#c62828";
      }
    } catch {
      statusIcon.textContent = "error";
      statusIcon.style.color = "#c62828";
      statusText.textContent = "Desconectado";
      if (!isQR) {
        disconnectBtn?.classList.add("hidden");
        connectBtn?.classList.remove("hidden");
      }
      if (waDot) waDot.style.background = "#c62828";
    }
  }

  /* =========================
     LOAD CONTACTS
  ========================= */
  async function loadContacts() {
    contactsList.innerHTML = '<div class="wa-loading">Cargando clientes...</div>';

    try {
      // Limpiar badge de WhatsApp al entrar
      localStorage.setItem("wa_notif_count", "0");
      if (typeof window.setWaNotifCount === "function") window.setWaNotifCount(0);

      const { data: users, error: uErr } = await supabaseClient
        .from("users")
        .select("id, name, email, phone, photo_url")
        .not("phone", "is", null)
        .not("phone", "eq", "");

      const { data: addresses, error: aErr } = await supabaseClient
        .from("addresses")
        .select("user_id, phone, full_name");

      if (uErr) throw uErr;

      const addrMap = {};
      if (addresses) {
        addresses.forEach(a => {
          if (a.phone && a.phone.trim()) {
            if (!addrMap[a.user_id] || a.phone.length > addrMap[a.user_id].length) {
              addrMap[a.user_id] = { phone: a.phone, name: a.full_name };
            }
          }
        });
      }

      const seen = new Set();
      const usedPhones = new Set();
      const contacts = [];

      (users || []).forEach(u => {
        const phone = u.phone || addrMap[u.id]?.phone;
        const name = u.name || addrMap[u.id]?.name || "Cliente";
        const clean = phone?.replace(/\D/g, "");
        if (phone && clean?.length >= 8 && !seen.has(u.id)) {
          seen.add(u.id);
          usedPhones.add(clean);
          contacts.push({ id: u.id, name, phone: phone.trim(), email: u.email, photo_url: u.photo_url });
        }
      });

      if (addresses) {
        addresses.forEach(a => {
          if (a.phone && a.phone.replace(/\D/g, "").length >= 8 && !seen.has(a.user_id)) {
            seen.add(a.user_id);
            const clean = a.phone.replace(/\D/g, "");
            usedPhones.add(clean);
            contacts.push({ id: a.user_id, name: a.full_name || "Cliente", phone: a.phone.trim() });
          }
        });
      }

      // Solo traer chats de WhatsApp si la instancia está conectada
      try {
        const stateResp = await fetch(`${API_URL}/instance/connectionState/${INSTANCE}`, {
          method: "GET", headers: { "Content-Type": "application/json", apikey: API_KEY }
        });
        const stateData = stateResp.ok ? await stateResp.json() : null;
        const isConnected = stateData?.instance?.state === "open";

        if (isConnected) {
          const resp = await fetch(`${API_URL}/chat/findChats/${INSTANCE}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: API_KEY },
            body: "{}"
          });
          if (resp.ok) {
            const records = await resp.json();
            (Array.isArray(records) ? records : []).forEach(chat => {
              const jid = chat.remoteJid || "";
              if (jid.endsWith("@lid")) return;
              const phoneRaw = jid.replace(/@.*$/, "");
              if (!phoneRaw || phoneRaw.length < 8 || usedPhones.has(phoneRaw)) return;
              usedPhones.add(phoneRaw);
              contacts.push({
                id: "wa_" + phoneRaw,
                name: chat.pushName || phoneRaw,
                phone: phoneRaw,
                email: null,
                photo_url: null
              });
            });
          }
        }
      } catch (_) {}

      // Agregar grupo de pedidos como contacto fijo
      const GROUP_JID = "120363410476492208@g.us";
      if (!contacts.some(c => c.phone === GROUP_JID)) {
        contacts.unshift({
          id: "group_pedidos",
          name: "☕ Café cortero - Pedidos",
          phone: GROUP_JID,
          email: null,
          photo_url: null,
          isGroup: true
        });
      }

      allContacts = contacts;
      filteredContacts = [...contacts];
      renderContacts();

      // Auto-seleccionar grupo de pedidos
      if (!selectedContact) {
        const group = contacts.find(c => c.id === "group_pedidos");
        if (group) {
          selectContact(group);
          // Marcar mensajes ya cargados como vistos para el badge
          setTimeout(() => {
            for (const id of Object.keys(cachedApiMessages)) {
              for (const m of cachedApiMessages[id]) {
                if (m.msgId) notifiedMessages.add(m.msgId);
              }
            }
          }, 1000);
        }
      }
    } catch (err) {
      console.error("Error cargando contactos:", err);
      contactsList.innerHTML = '<div class="wa-loading">Error al cargar clientes</div>';
    }
  }

  /* =========================
     RENDER
  ========================= */
  function renderContacts() {
    contactsList.innerHTML = "";
    contactsCount.textContent = filteredContacts.length;

    if (filteredContacts.length === 0) {
      contactsList.innerHTML = '<div class="wa-loading">No se encontraron clientes con WhatsApp</div>';
      return;
    }

    filteredContacts.forEach(c => {
      const div = document.createElement("div");
      div.className = `wa-contact-item${selectedContact?.id === c.id ? " active" : ""}`;
      const icon = c.isGroup ? "local_cafe" : "person";
      div.innerHTML = `
        <div class="wa-contact-avatar">
          <span class="material-symbols-outlined">${icon}</span>
        </div>
        <div class="wa-contact-info">
          <div class="wa-contact-name">${c.name}</div>
          <div class="wa-contact-phone">${c.isGroup ? "Grupo de WhatsApp" : c.phone}</div>
        </div>
      `;
      div.onclick = () => selectContact(c);
      contactsList.appendChild(div);
    });
  }

  function selectContact(contact) {
    selectedContact = contact;
    renderContacts();

    noSelection.classList.add("hidden");
    chat.classList.remove("hidden");

    // Limpiar badge al seleccionar un contacto
    localStorage.setItem("wa_notif_count", "0");
    if (typeof window.setWaNotifCount === "function") window.setWaNotifCount(0);

    chatName.textContent = contact.name;
    chatPhone.textContent = contact.isGroup ? "Grupo de WhatsApp" : contact.phone;
    messageInput.value = "";
    messageInput.disabled = false;
    sendBtn.disabled = false;

    document.querySelector(".wa-sidebar")?.classList.add("wa-sidebar-hidden");

    loadMessages(contact, false);
    if (messagesRefreshTimer) clearInterval(messagesRefreshTimer);
    messagesRefreshTimer = setInterval(() => loadMessages(contact, true), 5000);
  }

  /* =========================
     MESSAGES
  ========================= */
  function getPhoneVariants(phone) {
    const clean = phone.replace(/\D/g, "");
    const variants = [clean, `${clean}@s.whatsapp.net`];
    if (clean.startsWith("504")) variants.push(clean.slice(3));
    if (clean.length >= 10) variants.push(clean.slice(-9));
    return variants;
  }

  function matchesContact(jid, phoneVariants) {
    if (!jid) return false;
    return phoneVariants.some(v => jid.includes(v));
  }

  function renderMessageList(messages) {
    chatHistory.innerHTML = "";

    if (messages.length === 0) {
      chatHistory.innerHTML = '<div class="wa-history-placeholder"><span class="material-symbols-outlined">history</span><p>No hay mensajes previos. Envía el primer mensaje.</p></div>';
      return;
    }

    messages.sort((a, b) => (a.ts || a.messageTimestamp || 0) - (b.ts || b.messageTimestamp || 0));

    messages.forEach(msg => {
      const text = msg.text || "—";
      const fromMe = msg.fromMe;
      const time = msg.time || (msg.messageTimestamp
        ? new Date(msg.messageTimestamp * 1000).toLocaleString("es-HN")
        : "");

      const bubble = document.createElement("div");
      bubble.className = `wa-message-bubble ${fromMe ? "sent" : "received"}`;
      bubble.innerHTML = `${text}${time ? `<div class="wa-message-time">${time}</div>` : ""}`;
      chatHistory.appendChild(bubble);
    });

    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  const cachedApiMessages = {};

  async function loadMessages(contact, silent) {
    if (!silent) chatHistory.innerHTML = '<div class="wa-history-placeholder"><span class="material-symbols-outlined">hourglass_empty</span><p>Cargando mensajes...</p></div>';

    const contactId = contact.id;
    const phoneVariants = getPhoneVariants(contact.phone);
    const local = sentMessages[contactId] || [];
    const LIMIT = 999;

    async function fetchPage(page) {
      const resp = await fetch(`${API_URL}/chat/findMessages/${INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ number: phoneVariants[0], page, limit: LIMIT })
      });
      if (!resp.ok) return null;
      return resp.json();
    }

    try {
      if (silent && cachedApiMessages[contactId]) {
        const data = await fetchPage(1);
        if (data) {
          const records = data?.messages?.records || [];
          const knownIds = new Set(cachedApiMessages[contactId].map(m => m.msgId));
          const newMatched = records
            .filter(r => {
              const msgId = r.key?.id || "";
              if (knownIds.has(msgId)) return false;
              const jid = r.key?.remoteJid || "";
              const alt = r.remoteJidAlt || "";
              return matchesContact(jid, phoneVariants) || matchesContact(alt, phoneVariants);
            })
            .map(r => ({
              msgId: r.key?.id || "",
              text: r.message?.conversation || (r.message?.imageMessage ? "[imagen]" : null) || (r.message?.audioMessage ? "[audio]" : null) || (r.message?.stickerMessage ? "[sticker]" : null) || "—",
              fromMe: r.key?.fromMe === true,
              time: r.messageTimestamp ? new Date(r.messageTimestamp * 1000).toLocaleString("es-HN") : "",
              messageTimestamp: r.messageTimestamp,
              ts: r.messageTimestamp || 0
            }));
          if (newMatched.length > 0) {
            cachedApiMessages[contactId].push(...newMatched);
          }
        }
        const all = [...cachedApiMessages[contactId], ...local];
        renderMessageList(all);
        return;
      }

      let allApiMessages = [];
      let totalPages = 1;
      const MAX_PAGES = 20;

      for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
        const data = await fetchPage(page);
        if (!data) break;

        totalPages = data?.messages?.pages || 1;
        const records = data?.messages?.records || [];

        const matched = records
          .filter(r => {
            const jid = r.key?.remoteJid || "";
            const alt = r.remoteJidAlt || "";
            return matchesContact(jid, phoneVariants) || matchesContact(alt, phoneVariants);
          })
          .map(r => ({
            msgId: r.key?.id || "",
            text: r.message?.conversation || (r.message?.imageMessage ? "[imagen]" : null) || (r.message?.audioMessage ? "[audio]" : null) || (r.message?.stickerMessage ? "[sticker]" : null) || "—",
            fromMe: r.key?.fromMe === true,
            time: r.messageTimestamp ? new Date(r.messageTimestamp * 1000).toLocaleString("es-HN") : "",
            messageTimestamp: r.messageTimestamp,
            ts: r.messageTimestamp || 0
          }));

        allApiMessages.push(...matched);
        if (!records.length) break;
      }

      cachedApiMessages[contactId] = allApiMessages;
      const all = [...allApiMessages, ...local];
      renderMessageList(all);
    } catch {
      renderMessageList(local);
    }
  }

  /* =========================
     SEND
  ========================= */
  async function handleSend() {
    if (!selectedContact) return;
    const text = messageInput.value.trim();
    const hasImage = pendingImage !== null;
    if (!text && !hasImage) return;

    sendBtn.disabled = true;
    messageInput.disabled = true;
    if (attachBtn) attachBtn.disabled = true;

    const isGroup = selectedContact.isGroup;
    const fullNumber = isGroup
      ? selectedContact.phone
      : (() => {
          const clean = selectedContact.phone.replace(/\D/g, "");
          return selectedContact.phone.trim().startsWith("+") ? clean : `504${clean}`;
        })();
    const now = new Date().toLocaleString("es-HN");
    const ts = Date.now();

    try {
      let resp;
      if (hasImage) {
        const raw = pendingImage.base64.replace(/^data:image\/\w+;base64,/, "");
        resp = await fetch(`${API_URL}/message/sendMedia/${INSTANCE}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: API_KEY },
          body: JSON.stringify({
            number: fullNumber,
            mediatype: "image",
            media: raw,
            caption: text || ""
          })
        });
      } else {
        resp = await fetch(`${API_URL}/message/sendText/${INSTANCE}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: API_KEY },
          body: JSON.stringify({ number: fullNumber, text })
        });
      }

      if (!resp.ok) throw new Error("HTTP " + resp.status);

      if (!sentMessages[selectedContact.id]) sentMessages[selectedContact.id] = [];
      sentMessages[selectedContact.id].push({
        text: hasImage ? `[imagen] ${text}` : text,
        image: hasImage ? pendingImage.base64 : null,
        fromMe: true,
        time: now,
        ts
      });

      const bubble = document.createElement("div");
      bubble.className = "wa-message-bubble sent";
      bubble.innerHTML = hasImage
        ? `<img class="wa-msg-img" src="${pendingImage.base64}" alt="imagen" />${text ? `<p>${text}</p>` : ""}<div class="wa-message-time">${now}</div>`
        : `${text}<div class="wa-message-time">${now}</div>`;
      chatHistory.appendChild(bubble);
      chatHistory.scrollTop = chatHistory.scrollHeight;

      messageInput.value = "";
      previewArea?.classList.add("hidden");
      previewImg.src = "";
      pendingImage = null;
      showSnack("Mensaje enviado", "success");
    } catch (err) {
      console.error(err);
      showSnack("Error al enviar", "error");
    } finally {
      sendBtn.disabled = false;
      messageInput.disabled = false;
      messageInput.focus();
      if (attachBtn) attachBtn.disabled = false;
    }
  }

  /* =========================
     CHECK BADGE (sin notificaciones push)
  ========================= */
  async function checkBadge() {
    try {
      const resp = await fetch(`${API_URL}/chat/findMessages/${INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ page: 1, limit: 5 })
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const records = data?.messages?.records || [];
      for (const r of records) {
        const jid = r.key?.remoteJid || "";
        const alt = r.remoteJidAlt || "";
        const ts = r.messageTimestamp || 0;
        if (ts <= lastSeenTs) continue;
        const msgId = r.key?.id || "";
        if (notifiedMessages.has(msgId)) continue;
        let matched = null;
        for (const c of allContacts) {
          const variants = getPhoneVariants(c.phone);
          if (matchesContact(jid, variants) || matchesContact(alt, variants)) {
            matched = c;
            break;
          }
        }
        if (!matched) continue;
        notifiedMessages.add(msgId);
        if (!selectedContact || selectedContact.id !== matched.id) {
          const cur = parseInt(localStorage.getItem("wa_notif_count") || "0", 10);
          const n = cur + 1;
          localStorage.setItem("wa_notif_count", String(n));
          if (typeof window.setWaNotifCount === "function") window.setWaNotifCount(n);
        }
      }
      for (const r of records) {
        const ts = r.messageTimestamp || 0;
        if (ts > lastSeenTs) lastSeenTs = ts;
      }
    } catch (_) {}
  }

  /* =========================
     PUSH NOTIFICATIONS
  ========================= */
  async function pollNewMessages() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      const resp = await fetch(`${API_URL}/chat/findMessages/${INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ page: 1, limit: 5 })
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const records = data?.messages?.records || [];
      for (const r of records) {
        const fm = r.key?.fromMe;
        if (fm !== false) continue;
        const jid = r.key?.remoteJid || "";
        const alt = r.remoteJidAlt || "";
        const ts = r.messageTimestamp || 0;
        if (ts <= lastSeenTs) continue;
        const msgId = r.key?.id || "";
        if (notifiedMessages.has(msgId)) continue;
        let matched = null;
        for (const c of allContacts) {
          const variants = getPhoneVariants(c.phone);
          if (matchesContact(jid, variants) || matchesContact(alt, variants)) {
            matched = c;
            break;
          }
        }
        if (!matched) continue;
        notifiedMessages.add(msgId);
        const text =
          r.message?.conversation ||
          (r.message?.imageMessage ? "📷 Imagen" : null) ||
          (r.message?.audioMessage ? "🎵 Audio" : null) ||
          (r.message?.stickerMessage ? "🖼️ Sticker" : null) ||
          "Mensaje nuevo";
        try {
          new Notification("☕ Café Cortero", {
            body: `${matched.name}: ${text}`,
            icon: "/favicon.ico",
            tag: msgId,
            silent: false
          });
        } catch (_) {}
      }
      for (const r of records) {
        const ts = r.messageTimestamp || 0;
        if (ts > lastSeenTs) lastSeenTs = ts;
      }
    } catch (_) {}
  }

  /* =========================
     UTILS
  ========================= */
  function showSnack(text, type) {
    const snack = document.getElementById("snackbar");
    snack.textContent = text;
    snack.className = `snackbar active ${type}`;
    setTimeout(() => snack.classList.remove("active"), 3000);
  }

  /* =========================
     EVENTS
  ========================= */
  document.getElementById("wa-back-btn")?.addEventListener("click", () => {
    document.querySelector(".wa-sidebar")?.classList.remove("wa-sidebar-hidden");
    chat?.classList.add("hidden");
    noSelection?.classList.remove("hidden");
    selectedContact = null;
    if (messagesRefreshTimer) { clearInterval(messagesRefreshTimer); messagesRefreshTimer = null; }
    renderContacts();
  });

  searchInput?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    filteredContacts = allContacts.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
    renderContacts();
  });

  sendBtn?.addEventListener("click", handleSend);
  messageInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  /* =========================
     INIT
  ========================= */
  if (document.getElementById("main-header")) {
    injectGear();
  } else {
    document.addEventListener("header:ready", injectGear);
  }

  // Start badge checker every 15s (no requiere permisos de notificación)
  setInterval(checkBadge, 15000);
  // Also start immediately when contacts are ready, via a small delay
  setTimeout(() => {
    if (allContacts.length > 0) checkBadge();
  }, 6000);

  // Start notification polling every 30s
  notificationPollTimer = setInterval(pollNewMessages, 30000);
  setTimeout(() => {
    if (allContacts.length > 0) pollNewMessages();
  }, 5000);
});
