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
  const sentMessages = {};

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

  /* =========================
     INJECT GEAR INTO HEADER
  ========================= */
   function injectGear() {
    const headerRight = document.querySelector(".header-right-stitch");
    if (!headerRight || document.getElementById("wa-settings-btn")) return;

    const cartBtn = document.getElementById("cart-btn");

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
          <span class="material-symbols-outlined">qr_code_scanner</span> Conectar WhatsApp
        </button>
      </div>
    `;
    headerRight.insertBefore(wrapper, cartBtn);
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
    });

    document.addEventListener("click", () => {
      settingsDropdown?.classList.add("hidden");
    });

    settingsDropdown?.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    disconnectBtn?.addEventListener("click", async () => {
      settingsDropdown?.classList.add("hidden");
      const ok = confirm("¿Desconectar WhatsApp de la instancia CafeCortero? Los clientes no recibirán notificaciones hasta que reconectes.");
      if (!ok) return;
      try {
        const resp = await fetch(`${API_URL}/instance/logout/${INSTANCE}`, {
          method: "DELETE", headers: { apikey: API_KEY }
        });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        showSnack("WhatsApp desconectado", "success");
        await updateStatus();
      } catch (err) {
        console.error(err);
        showSnack("Error al desconectar", "error");
      }
    });

    connectBtn?.addEventListener("click", () => {
      settingsDropdown?.classList.add("hidden");
      window.open("https://132.145.42.123:3002", "_blank");
    });
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
        disconnectBtn?.classList.remove("hidden");
        connectBtn?.classList.add("hidden");
        if (waDot) waDot.style.background = "#2e7d32";
      } else if (state === "connecting") {
        statusIcon.textContent = "hourglass_empty";
        statusIcon.style.color = "#f9a825";
        statusText.textContent = "Conectándose...";
        disconnectBtn?.classList.add("hidden");
        connectBtn?.classList.add("hidden");
        if (waDot) waDot.style.background = "#f9a825";
      } else {
        statusIcon.textContent = "error";
        statusIcon.style.color = "#c62828";
        statusText.textContent = "Desconectado";
        disconnectBtn?.classList.add("hidden");
        connectBtn?.classList.remove("hidden");
        if (waDot) waDot.style.background = "#c62828";
      }
    } catch {
      statusIcon.textContent = "error";
      statusIcon.style.color = "#c62828";
      statusText.textContent = "Error de conexión";
      disconnectBtn?.classList.add("hidden");
      connectBtn?.classList.add("hidden");
      if (waDot) waDot.style.background = "#c62828";
    }
  }

  /* =========================
     LOAD CONTACTS
  ========================= */
  async function loadContacts() {
    contactsList.innerHTML = '<div class="wa-loading">Cargando clientes...</div>';

    try {
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
      const contacts = [];

      (users || []).forEach(u => {
        const phone = u.phone || addrMap[u.id]?.phone;
        const name = u.name || addrMap[u.id]?.name || "Cliente";
        if (phone && phone.replace(/\D/g, "").length >= 8 && !seen.has(u.id)) {
          seen.add(u.id);
          contacts.push({ id: u.id, name, phone: phone.trim(), email: u.email, photo_url: u.photo_url });
        }
      });

      if (addresses) {
        addresses.forEach(a => {
          if (a.phone && a.phone.replace(/\D/g, "").length >= 8 && !seen.has(a.user_id)) {
            seen.add(a.user_id);
            contacts.push({ id: a.user_id, name: a.full_name || "Cliente", phone: a.phone.trim() });
          }
        });
      }

      allContacts = contacts;
      filteredContacts = [...contacts];
      renderContacts();
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
      div.innerHTML = `
        <div class="wa-contact-avatar">
          <span class="material-symbols-outlined">person</span>
        </div>
        <div class="wa-contact-info">
          <div class="wa-contact-name">${c.name}</div>
          <div class="wa-contact-phone">${c.phone}</div>
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

    chatName.textContent = contact.name;
    chatPhone.textContent = contact.phone;
    messageInput.value = "";
    messageInput.disabled = false;
    sendBtn.disabled = false;

    // En móvil, ocultar sidebar y mostrar solo el chat
    document.querySelector(".wa-sidebar")?.classList.add("wa-sidebar-hidden");

    loadMessages(contact);
  }

  /* =========================
     MESSAGES
  ========================= */
  function getPhoneVariants(phone) {
    const clean = phone.replace(/\D/g, "");
    const variants = [clean, `${clean}@s.whatsapp.net`];
    if (clean.startsWith("504")) variants.push(clean.slice(3));
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

  async function loadMessages(contact) {
    chatHistory.innerHTML = '<div class="wa-history-placeholder"><span class="material-symbols-outlined">hourglass_empty</span><p>Cargando mensajes...</p></div>';

    const contactId = contact.id;
    const phoneVariants = getPhoneVariants(contact.phone);
    const local = sentMessages[contactId] || [];

    try {
      const resp = await fetch(`${API_URL}/chat/findMessages/${INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ number: phoneVariants[0], page: 1, limit: 50 })
      });

      if (resp.ok) {
        const data = await resp.json();
        const records = data?.messages?.records || [];

        const apiMessages = records
          .filter(r => {
            const jid = r.key?.remoteJid || "";
            const alt = r.remoteJidAlt || "";
            return matchesContact(jid, phoneVariants) || matchesContact(alt, phoneVariants);
          })
          .map(r => ({
            text: r.message?.conversation || (r.message?.imageMessage ? "[imagen]" : null) || (r.message?.audioMessage ? "[audio]" : null) || (r.message?.stickerMessage ? "[sticker]" : null) || "—",
            fromMe: r.key?.fromMe === true,
            time: r.messageTimestamp ? new Date(r.messageTimestamp * 1000).toLocaleString("es-HN") : "",
            messageTimestamp: r.messageTimestamp,
            ts: r.messageTimestamp || 0
          }));

        const all = [...apiMessages, ...local];
        renderMessageList(all);
      } else {
        renderMessageList(local);
      }
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
    if (!text) return;

    sendBtn.disabled = true;
    messageInput.disabled = true;

    try {
      const cleanPhone = selectedContact.phone.replace(/\D/g, "");
      const hasCC = selectedContact.phone.trim().startsWith("+");
      const fullNumber = hasCC ? cleanPhone : `504${cleanPhone}`;

      const resp = await fetch(`${API_URL}/message/sendText/${INSTANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ number: fullNumber, text })
      });

      if (!resp.ok) throw new Error("HTTP " + resp.status);

      const now = new Date().toLocaleString("es-HN");
      const ts = Date.now();

      if (!sentMessages[selectedContact.id]) sentMessages[selectedContact.id] = [];
      sentMessages[selectedContact.id].push({ text, fromMe: true, time: now, ts });

      const bubble = document.createElement("div");
      bubble.className = "wa-message-bubble sent";
      bubble.innerHTML = `${text}<div class="wa-message-time">${now}</div>`;
      chatHistory.appendChild(bubble);
      chatHistory.scrollTop = chatHistory.scrollHeight;

      messageInput.value = "";
      showSnack("Mensaje enviado", "success");
    } catch (err) {
      console.error(err);
      showSnack("Error al enviar", "error");
    } finally {
      sendBtn.disabled = false;
      messageInput.disabled = false;
      messageInput.focus();
    }
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
});
