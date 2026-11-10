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

### 📊 Matriz de Asignación y Cadena de Relevo Automática (Failover de Modelos)

Mapeo estricto según las suscripciones activas (**Codex** con 100% de cuota y **Google Antigravity**). El Orquestador aplica esta cascada automáticamente: si el modelo primario agota su cuota de 5h o semanal (error de rate limit / cuota), **debe saltar de inmediato al siguiente nivel sin detenerse a consultar**:

| Rol / Agente | Nivel 1 (Principal por Defecto) | Nivel 2 (Primer Relevo - Codex) | Nivel 3 (Segundo Relevo - Flash) | Nivel 4 (Emergencia Final) |
|---|---|---|---|---|
| **1. Desarrollador** *(Código, JS, Supabase, Diffs)* | **`GPT-6.1-Sol`** | **`GPT-6-Sol`** | **`GPT-6.1 Terra`** | **`Claude Sonnet 5.5`** |
| **2. Orquestador** *(Desglose, Coordinación, Rutas)* | **`GPT-6-Astra`** | **`Gemini 3.8 Flash`** | **`Gemini 3.5 Flash`** | **`GPT-5.6-Terra`** |
| **3. Diseñador** *(CSS, Paleta, Móvil, 4px)* | **`GPT-6-Luna`** | **`GPT-5.6-Luna`** | **`Gemini 3.8 Flash`** | **`Gemini 3.5 Flash`** |
| **4. Auditor** *(QA, BD Supabase, Post-check)* | **`GPT-6.1 Terra`** | **`GPT-6-Astra`** | **`Gemini 3.8 Flash`** | **`GPT-5.6-Terra`** |

### ⚡ Protocolo de Conmutación Automática por Cuota (Sin Interrupción)
1. **Detección Inmediata:** Si cualquier llamada a un modelo devuelve advertencia de cuota agotada, rate limit (429) o bloqueo de ventana móvil:
   - El Orquestador **no se detiene ni pide confirmación**.
   - Conmuta de forma transparente al modelo de **Nivel 2** (o siguiente disponible).
   - Informa en una sola línea ejecutiva: `[RELEVO]: Cuota de <Modelo A> agotada. Continuando con <Modelo B>`.
2. **Prioridad de Consumo de Cuotas:**
   - **Codex (100% cuota semanal):** Es el caballo de batalla principal para código (`GPT-6.1-Sol`) y auditoría (`GPT-6.1 Terra`).
   - **Gemini Flash (Ventana móvil 5h):** Es el comodín ligero para orquestación rápida y verificación de estilos.
   - **Claude Sonnet 5.5 / Opus 5.5 (Reserva):** Reservados exclusivamente para el Nivel 4 o cuando se requiera validación arquitectónica crítica.

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
