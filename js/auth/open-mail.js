document.getElementById("openMailBtn").addEventListener("click", () => {
  // Detectar proveedores comunes
  const email = localStorage.getItem("cc_last_recovery_email"); // (opcional)

  if (email) {
    const domain = email.split("@")[1].toLowerCase();

    if (domain.includes("gmail")) {
      window.location.href = "https://mail.google.com/";
      return;
    }
    if (domain.includes("hotmail") || domain.includes("outlook") || domain.includes("live")) {
      window.location.href = "https://outlook.live.com/";
      return;
    }
    if (domain.includes("yahoo")) {
      window.location.href = "https://mail.yahoo.com/";
      return;
    }
  }

  // Si no sabemos qué correo usa:
  window.location.href = "https://google.com/search?q=abrir+mi+correo";
});
