document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "https://132.145.42.123:8080";
  const INSTANCE = "CafeCortero";
  const API_KEY = "429683C4C977415CAAFCCE10F7D57E11";

  const statusIcon = document.getElementById("status-icon");
  const statusText = document.getElementById("status-text");
  const statusBar = document.getElementById("wa-status");
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

  const user = JSON.parse(localStorage.getItem("cortero_user"));
  if (!user || user.rol !== "admin") {
    window.location.href = "/pages/auth/login.html";
    return;
  }

  let allContacts = [];
  let filteredContacts = [];
  let selectedContact = null;
  let messageHistory = [];

  /* =========================
     STATUS
  ========================= */
  async function updateStatus() {
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
        statusText.textContent = "WhatsApp conectado";
        statusBar.className = "wa-status-bar";
      } else if (state === "connecting") {
        statusIcon.textContent = "hourglass_empty";
        statusIcon.style.color = "#f9a825";
        statusText.textContent = "WhatsApp conectándose...";
        statusBar.className = "wa-status-bar";
      } else {
        statusIcon.textContent = "error";
        statusIcon.style.color = "#c62828";
        statusText.textContent = "WhatsApp desconectado";
        statusBar.className = "wa-status-bar error";
      }
    } catch {
      statusIcon.textContent = "error";
      statusIcon.style.color = "#c62828";
      statusText.textContent = "Error de conexión con el servidor";
      statusBar.className = "wa-status-bar error";
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

    loadMessages(contact);
  }

  /* =========================
     MESSAGES
  ========================= */
  async function loadMessages(contact) {
    chatHistory.innerHTML = '<div class="wa-history-placeholder"><span class="material-symbols-outlined">hourglass_empty</span><p>Cargando mensajes...</p></div>';

    try {
      const cleanPhone = contact.phone.replace(/\D/g, "");
      const resp = await fetch(
        `${API_URL}/chat/findMessages/${INSTANCE}?number=${cleanPhone}&page=1&limit=20`,
        { method: "GET", headers: { apikey: API_KEY } }
      );

      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      const messages = data?.messages || data?.records || [];

      chatHistory.innerHTML = "";
      if (messages.length === 0) {
        chatHistory.innerHTML = '<div class="wa-history-placeholder"><span class="material-symbols-outlined">history</span><p>No hay mensajes previos. Envía el primer mensaje.</p></div>';
        return;
      }

      messages.forEach(msg => {
        const text = msg.message?.conversation || msg.text || "—";
        const fromMe = msg.key?.fromMe || msg.fromMe;
        const time = msg.messageTimestamp
          ? new Date(msg.messageTimestamp * 1000).toLocaleString("es-HN")
          : "";

        const bubble = document.createElement("div");
        bubble.className = `wa-message-bubble ${fromMe ? "sent" : "received"}`;
        bubble.innerHTML = `${text}${time ? `<div class="wa-message-time">${time}</div>` : ""}`;
        chatHistory.appendChild(bubble);
      });

      chatHistory.scrollTop = chatHistory.scrollHeight;
    } catch {
      chatHistory.innerHTML = '<div class="wa-history-placeholder"><span class="material-symbols-outlined">info</span><p>No se pudo cargar el historial. Envía un mensaje para iniciar la conversación.</p></div>';
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
  updateStatus();
  setInterval(updateStatus, 10000);
  loadContacts();
});
