document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "https://132.145.42.123:8080";
  const INSTANCE_NAME = "CafeCortero";
  const GLOBAL_API_KEY = "429683C4C977415CAAFCCE10F7D57E11";
  const statusIcon = document.getElementById("status-icon");
  const statusText = document.getElementById("status-text");
  const statusBar = document.getElementById("wa-status");

  const user = JSON.parse(localStorage.getItem("cortero_user"));
  if (!user || user.rol !== "admin") {
    window.location.href = "/pages/auth/login.html";
    return;
  }

  async function updateStatus() {
    try {
      const resp = await fetch(`${API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
        method: "GET", headers: { "Content-Type": "application/json", apikey: GLOBAL_API_KEY }
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

  updateStatus();
  setInterval(updateStatus, 10000);
});
