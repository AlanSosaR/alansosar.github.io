# Café Cortero — AGENTS.md
> **Sistema de Orquestación y Guía Maestra de Desarrollo**  
> Vanilla HTML/CSS/JS e-commerce PWA. Backend en Supabase. Sin build step.

---

## 1. Quick Reference & Dev Commands

| Comando | Acción |
|---|---|
| `npm run dev:safe` | **USAR SIEMPRE ESTE.** Limpia procesos zombies en puerto 3005, inicia en background, verifica el socket y registra en `server.log`. |
| `npm run dev:safe:open` | Igual que `dev:safe`, pero abre el navegador del sistema. |
| `npm run dev` | `live-server` básico en puerto 3005 sin abrir navegador. |
| `npm run dev:open` | `live-server` básico abriendo navegador. |

- **Sin paso de compilación (`no build step`):** No usar Webpack, Vite, ni Bundlers en el frontend.
- **Sin framework JS:** Vanilla JS modular (`js/pages/`, `js/core/`, `js/ui/`).
- **Backend:** Supabase (Auth, Postgres DB, Storage, Edge Functions en Deno/TS).
- **Notificaciones:** Firebase Cloud Messaging (`firebase-messaging-sw.js`) + Edge Function `send-push-notification`.
- **API Serverless:** `api/wa-proxy.js` (proxy de WhatsApp en Vercel).

---

## 2. Sistema de Orquestación Multirrol

Para garantizar precisión, calidad y **mínimo consumo de tokens**, cada tarea debe procesarse siguiendo la dinámica de 4 roles especializados:

```
[ Solicitud del Usuario ]
          │
          ▼
   1. ORQUESTADOR  ──────> Diagnóstico y división de subtareas atómicas
          │
          ├──> 2. AUDITOR (Pre-check): Validación de impacto y reglas de BD
          │
          ├──> 3. DISEÑADOR (UI/UX): Validación de paleta, tipografía y móvil
          │
          ├──> 4. DESARROLLADOR: Implementación quirúrgica (líneas exactas)
          │
          └──> 5. AUDITOR (Post-check): Validación final, sintaxis y regresiones
          │
          ▼
[ Respuesta Concisa al Usuario ]
```

### 📊 Matriz de Asignación con tu Menú Exacto de Modelos

Mapeo específico según los modelos de tus dos suscripciones (**Google Antigravity** y **Codex / ChatGPT** con 100% de cuota):

| Rol / Agente | Modelo Principal (Recomendado) | Modelo Alternativo | ¿Por qué y qué hace? |
|---|---|---|---|
| **1. Desarrollador** *(Developer / Coder)* | **GPT-6.1-Sol** *(Codex 100%)* | **Claude Sonnet 5.5** | **El programador estrella.** Máxima inteligencia y precisión en diffs (`edit_file`). Escribe JavaScript, lógica de carrito, checkout e integración con Supabase sin errores de sintaxis. Al estar al 100% en Codex, no consume tu cuota de Claude. |
| **2. Orquestador** *(Coordinator / Lead)* | **Gemini 3.8 Flash** | **GPT-6-Astra** | **El director del equipo.** Ultrarrápido y ligero. Descompone la solicitud en subtareas, decide qué archivos leer y coordina sin quemar cuota pesada (usa la ventana móvil de 5 horas de Gemini). |
| **3. Diseñador** *(UI / UX Guardian)* | **GPT-6-Luna** *(Codex)* | **Gemini 3.8 Flash** | **El custodio visual.** Los modelos *Luna / Flash* son ultraligeros. Perfectos para verificar paleta de colores (`#377b4c`), reglas CSS, espaciados en múltiplos de 4px y comportamiento móvil sin costo innecesario de tokens. |
| **4. Auditor** *(QA & Validación)* | **GPT-6-Astra** / **Terra** *(Codex)* | **Gemini 3.8 Flash** | **El inspector de calidad.** Excelente capacidad analítica intermedia para pre-check de BD (verificar que no se inventen tablas en Supabase) y post-check (probar que el servidor responda 200 OK y no haya regresiones). |

> [!TIP]
> **Guía Rápida para Elegir en el Desplegable:**
> - **Para codificar funciones o reparar errores complejos:** Selecciona **`GPT-6.1-Sol`** (tienes 100% de cuota semanal y de 5h en Codex).
> - **Para flujo de trabajo ágil, consultas, diseño o tareas generales:** Selecciona **`Gemini 3.8 Flash`** (Google) o **`GPT-6-Astra`** (Codex).
> - **Para retoques rápidos de CSS / diseño:** Selecciona **`GPT-6-Luna`** (Codex) o **`Gemini 3.8 Flash`**.
> - **Reserva de emergencia:** Deja **`Claude Sonnet 5.5`** o **`Claude Opus 5.5`** únicamente para cuando requieras una segunda opinión arquitectónica de altísimo nivel.

---

### 🎭 Roles y Responsabilidades

### 1. Orquestador (Coordinator / Team Lead)
- **Misión:** Controlar el flujo de trabajo, evitar acciones innecesarias y optimizar la cuota de tokens.
- **Reglas operativas:**
  - Descompone solicitudes complejas en pasos atómicos de un solo disparo.
  - Asigna mentalmente el rol activo en cada etapa (`[AUDITOR]`, `[DISEÑADOR]`, `[DESARROLLADOR]`).
  - No ejecuta comandos a ciegas: ubica archivos mediante búsqueda rápida antes de leer.

### 2. Desarrollador (Developer)
- **Misión:** Modificar código con precisión quirúrgica, asegurando robustez para producción.
- **Reglas operativas:**
  - **Prohibido inventar:** No agregar columnas, tablas, ni alterar tipos de datos sin migración formal.
  - **Ediciones mínimas:** Usar `edit_file` con bloques pequeños y exactos; nunca reescribir archivos completos de cientos de líneas.
  - **No romper:** Mantener callbacks, eventos y variables globales (`window.supabase`, etc.).
  - **Seguridad de datos:** Usar soft-delete (banderas `status = 'inactivo'`); nunca eliminar registros maestros sin confirmación expresa.

### 3. Diseñador (UI / UX Guardian)
- **Misión:** Custodiar la identidad visual artesanal, natural y minimalista de Café Cortero.
- **Paleta oficial estricta:**
  - **Verde Principal:** `#377b4c` | **Verde Secundario:** `#4CAF50` | **Éxito:** `#2E7D32`
  - **Acento Café:** `#8D6E63` | **Texto Café Oscuro:** `#512615`
  - **Textos:** Principal `#2B2B2B` | Secundario `#6B6B6B`
  - **Fondos:** `#FFFFFF` | `#F5F7F6`
  - **Estados:** Warning `#F9A825` | Error `#C62828` | Info `#1976D2`
  - *Prohibido usar colores fuera de esta paleta (nada de tonos neón ni grises desalineados).*
- **Reglas UI/UX:**
  - **Mobile-first:** Ancho máximo 1200px. Breakpoints: Mobile `< 768px`, Tablet `768–1024px`, Desktop `> 1024px`.
  - **Espaciados:** Múltiplos de 4px (4, 8, 12, 16, 24px).
  - **Tipografía:** Poppins / Roboto / Playfair Display (solo títulos selectos).
  - **PWA System Bars:** Barra superior siempre verde (`#377b4c`), barra de navegación inferior blanca/transparente (`viewport-fit=cover`).

### 4. Auditor (QA, BD & Seguridad)
- **Misión:** Validar la viabilidad y corrección de cada cambio antes y después de aplicar código.
- **Pre-check (Antes de editar):**
  - ¿Afecta tablas oficiales de Supabase (`users`, `addresses`, `products`, `orders`, `order_items`, `payment_receipts`, etc.)?
  - ¿Respeta los estados oficiales de pedido (`pending`, `confirmed`, `preparing`, `shipped`, `delivered`, `cancelled`)?
  - ¿Afecta el contador atómico de órdenes (`user_order_counters`)?
- **Post-check (Después de editar):**
  - Verificar que no queden errores de sintaxis, variables `null` o bucles no controlados.
  - Validar que el servidor local (`http://127.0.0.1:3005`) responda `200 OK`.
  - Asegurar que no haya regresiones en interfaces táctiles o móviles.

---

## 3. Protocolo Estricto de Optimización de Tokens

Para evitar el agotamiento de cuotas (especialmente en modelos con límites estrictos), se deben seguir estas reglas sin excepción:

1. **Lectura Quirúrgica de Archivos:**
   - **NUNCA** leer archivos completos de más de 100 líneas si solo se requiere una sección.
   - Usar `git grep -n` o búsquedas acotadas para encontrar el número de línea exacto.
   - En `read_file`, especificar siempre `StartLine` y `EndLine` con un margen máximo de 30-60 líneas alrededor del objetivo.

2. **Edición Atómica vs Reescritura:**
   - Usar `edit_file` con `Target` y `Replacement` cortos y concisos.
   - Evitar reemplazar bloques de 200 líneas si solo cambió una propiedad CSS o una condición JS.

3. **Respuestas Concisas y en Español:**
   - No repetir resúmenes extensos de código que el usuario ya conoce o que están en el archivo.
   - Dar respuestas ejecutivas, claras y al grano en español.
   - No explicar teoría básica a menos que el usuario lo solicite.

4. **Comandos de Terminal Optimizados:**
   - Comandos dirigidos y silenciosos (`--quiet`, `-ErrorAction SilentlyContinue`).
   - Evitar ejecutar comandos que vuelquen logs gigantes en la conversación. Usar pipes como `Select-Object -First 10` o `tail -n 20`.

5. **Revisión de Cambios Git:**
   - Antes de subir a Git, ejecutar `git status` y `git diff --stat` para verificar solo los archivos intencionales.

---

## 4. Estructura de la Base de Datos (Supabase — Fuente Única de Verdad)

- **`users`**: `id`, `name`, `email`, `phone`, `country`, `photo_url`, `rol`, `status` (`activo` | `inactivo`).
- **`addresses`**: `user_id`, `full_name`, `phone`, `country`, `state`, `city`, `street`, `postal_code`, `is_default`.
- **`products`**: `name`, `description`, `category`, `price`, `currency`, `stock`, `image_url`, `status`, `grind_type`, `presentation`, `featured`.
- **`orders`**: `user_id`, `address_id`, `status`, `total`, `payment_method`, `order_number`, `order_notes`.
- **`order_items`**: `order_id`, `product_id`, `quantity`, `price`.
- **`payment_receipts`**: `order_id`, `file_url`, `file_path`, `review_status` (`pending` | `approved` | `rejected`), `admin_comment`.
- **`user_order_counters`**: `user_id`, `last_number` (incremento atómico).
- **`reviews`**: `order_id`, `user_id`, `rating` (1–5), `comment`.
- **`notifications`**: `title`, `message`, `type`, `is_read`, `push_sent`, `metadata` (JSONB).
