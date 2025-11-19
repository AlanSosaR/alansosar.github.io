/* ============================================================
     CORE SCRIPTS — Café Cortero
   ============================================================ */

/* 
  Carga el SDK de Supabase desde CDN.
  Esto expone "supabase" en window.supabase.
*/
import "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

/*
  Carga el cliente global (createClient) y lo guarda en window.supabaseClient.
  Todas las demás partes del proyecto dependen de esto.
*/
import "./supabase-client.js";

/*
  Carga la lógica del header, drawer y control de usuarios logueados.
  Este archivo modifica el DOM del menú en todas las páginas.
*/
import "./auth-ui.js";

/*
  Lógica principal del sitio:
  - Carrito
  - Hero slider
  - Carrusel de productos
  - FAB
  - Cantidades
  - Eventos generales
*/
import "./main.js";
