---
trigger: always_on
---

CAFÉ CORTERO — GLOBAL RULES (MASTER)
Arquitectura + Base de Datos + Diseño + Estándares de Desarrollo

==================================================

1. PRINCIPIO GENERAL DEL PROYECTO
   ==================================================

Tipo de proyecto:
E-commerce de café artesanal (Café Cortero)

Prioridades:
Producción > prototipo
Consistencia > velocidad
Escalabilidad > soluciones rápidas
Base de datos real > suposiciones

Los agentes deben trabajar como equipo profesional:
Arquitecto → diseña
Developer → implementa
QA → valida

Ningún agente debe improvisar.

---

==================================================
2. FUENTE DE VERDAD (CRÍTICO)

Supabase es la única fuente oficial.

Prohibido:

- Inventar tablas
- Inventar columnas
- Cambiar tipos de datos
- Crear relaciones sin aprobación

Si se necesita un campo nuevo:

1. Propuesta al Arquitecto
2. Aprobación
3. Migración controlada

---

==================================================
3. TABLAS OFICIALES

users
(id, name, email, phone, country, photo_url, rol)

addresses
(user_id, full_name, phone, country, state, city, street, postal_code, is_default)

products
(name, description, category, price, currency, stock, image_url, status, grind_type, presentation, featured)

status:
activo | inactivo

grind_type:
Molido | En grano

orders
(user_id, address_id, status, total, payment_method, order_number, order_notes)

order_items
(order_id, product_id, quantity, price)

payment_receipts
(order_id, file_url, file_path, review_status, admin_comment)

review_status:
pending | approved | rejected

notifications
(title, message, type, is_read, push_sent, metadata)

push_tokens
(user_id, token, platform)

reviews
(product_id, user_id, rating, comment)

rating:
1–5

user_order_counters
(user_id, last_number)

---

==================================================
4. ESTADOS DEL SISTEMA

Estados de pedidos:

pending
confirmed
preparing
shipped
delivered
cancelled

Reglas:

- No agregar estados nuevos
- No traducir en BD
- Traducción solo en frontend

---

==================================================
5. REGLAS DE DATOS

Developer debe:

- Validar antes de insertar
- Usar transacciones cuando aplique
- No eliminar registros críticos (usar status)

order_number:

- Generado desde user_order_counters
- Incremento atómico
- No duplicar

metadata (notifications):
Usar JSONB para datos extra
No crear columnas nuevas

---

==================================================
6. IDENTIDAD VISUAL

Concepto:
Café artesanal, natural, premium, minimalista

Evitar:

- Colores neón
- Diseños recargados
- Estilos inconsistentes

---

==================================================
7. PALETA OFICIAL

Principal:
#2E7D32

Secundario:
#4CAF50

Acento café:
#8D6E63

Texto principal:
#2B2B2B

Texto secundario:
#6B6B6B

Fondos:
#FFFFFF
#F5F7F6

Estados:

Success: #2E7D32
Warning: #F9A825
Error: #C62828
Info: #1976D2

No usar colores fuera de esta paleta.

---

==================================================
8. TIPOGRAFÍA

Principal:
Roboto / Sans-serif

Pesos:
Títulos: 600–700
Subtítulos: 500
Texto: 400

Máximo 2 familias tipográficas.

---

==================================================
9. COMPONENTES UI

Botones:
Primary:
Background #2E7D32
Texto blanco
Border-radius 8px

Secondary:
Borde verde
Fondo blanco

Danger:
#C62828

Cards:
Background blanco
Radius 12px
Sombra suave
Padding 16px

Inputs:
Border-radius 8px
Border #E0E0E0
Focus #2E7D32
Error #C62828

---

==================================================
10. ESTADOS VISUALES DE PEDIDOS

pending → gris
confirmed → azul
preparing → naranja
shipped → azul oscuro
delivered → verde
cancelled → rojo

Mostrar como badges o chips.

---

==================================================
11. IMÁGENES

Productos:

- Fondo blanco o transparente
- Alta calidad

Receipts:
Mostrar preview
Si no existe → placeholder

---

==================================================
12. LAYOUT Y ESPACIADO

Base spacing:
4px

Común:
8px
12px
16px
24px

Layout:
Mobile first
Max width: 1200px

Breakpoints:

Mobile < 768px
Tablet 768–1024px
Desktop > 1024px

---

==================================================
13. UX OBLIGATORIO

- Loading states
- Mensajes de éxito/error
- Confirmaciones en acciones críticas
- Estados vacíos con ilustración o texto

Principio:
Simple > complejo
Claro > minimalismo extremo

---

==================================================
14. RESPONSABILIDADES DE AGENTES

Arquitecto

- Define estructura
- Aprueba cambios
- Diseña solución completa

Developer

- Implementa sin inventar
- Sigue diseño y BD
- Código listo para producción

QA

- Valida lógica
- Valida estructura BD
- Valida diseño (colores, tipografía, estados)

---

==================================================
15. REGLA CRÍTICA ANTI-GRAVITY

Si algo no existe:

NO improvisar
NO simular
NO inventar

Escalar al Arquitecto.

---

==================================================
16. PRINCIPIO FINAL

Consistencia > creatividad
Sistema > decisiones individuales
Producción > pruebas rápidas
