<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu selección de café | Café Cortero</title>

  <!-- Tipografía -->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />

  <!-- Iconos FontAwesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />

  <!-- Material Symbols (flecha) -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" />

  <!-- CSS del carrito -->
  <link rel="stylesheet" href="css/carrito.css?v=10" />
</head>

<body>
  <!-- === HEADER FIJO — CON LOGO, MISMO ESTILO DEL SITIO === -->
  <header class="header-fixed">
    <a href="index.html" class="header-logo-link">
      <img src="imagenes/logo.png" alt="Café Cortero" class="header-logo" />
    </a>

    <span class="cart-title">Tu selección de café</span>
  </header>

  <!-- === CONTENIDO PRINCIPAL === -->
  <main>

    <!-- Contenedor donde se insertan dinámicamente las tarjetas outline del carrito -->
    <div id="cart-container"></div>

    <!-- Total -->
    <div id="total-box" class="total-box">
      Total de tu selección: <span class="moneda">L</span> 0.00
    </div>

    <!-- Acciones -->
    <div class="actions">

      <!-- 🔙 Botón redondo con flecha -->
      <button class="back-btn-circle" onclick="window.location.href='index.html'">
        <span class="material-symbols-outlined">chevron_left</span>
      </button>

      <!-- Botón proceder con loader -->
      <button id="proceder-btn" class="m3-btn">
        <span class="loader"></span>
        <span class="btn-text">Proceder al pago</span>
      </button>
    </div>
  </main>

  <!-- === SNACKBAR (Carrito vacío) === -->
  <div id="aviso-vacio" class="snackbar-md3"></div>

  <!-- === SNACKBAR LOGIN === -->
  <div id="snackbar-login">
    Necesitas iniciar sesión para continuar con tu pedido.
  </div>

  <!-- === SCRIPT DEL CARRITO === -->
  <script src="js/cart.js?v=10"></script>
</body>
</html>
