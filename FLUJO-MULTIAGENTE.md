# Flujo multiagente — Café Cortero · DeepSeek Harness

## Activación

Indicación reutilizable para el agente principal:

> Aplica este flujo a la solicitud del usuario. Lee AGENTS.md y las instrucciones del ámbito afectado. Confirma la carpeta de trabajo y el servidor que la sirve. Protege los cambios existentes. Para tareas pequeñas, realiza las revisiones por roles sin crear agentes innecesarios. Para tareas complejas, delega subtareas independientes con subagent; usa workflow solo cuando el usuario haya pedido expresamente un flujo o una orquestación amplia. No publiques ni despliegues cambios sin autorización.

## 1. Orquestador: diagnóstico y plan

- Determinar objetivo, criterios de aceptación y archivos afectados mediante glob y grep.
- Confirmar raíz del proyecto: no confundir la carpeta contenedora con alansosar.github.io.
- Revisar git status y detectar modificaciones ajenas antes de editar.
- Crear una lista de tareas para trabajos de varios pasos.
- Consultar list_subagent_models antes de seleccionar proveedor/modelo.
- Delegar auditoría previa y diseño en paralelo cuando sean independientes; continuar inspección útil mientras trabajan.

## 2. Auditor: pre-check (solo lectura)

Entrada: solicitud, alcance, archivos relevantes y criterios de aceptación.

Revisar:
- Tablas y columnas existentes; no inventar esquema.
- Estados oficiales: pending, confirmed, preparing, shipped, delivered, cancelled.
- Integridad de user_order_counters y ausencia de eliminación de registros críticos.
- Riesgos para autenticación, eventos, callbacks, datos y cambios existentes.

Salida breve:
- Riesgos comprobados con rutas y líneas.
- Restricciones para implementar.
- Pruebas de aceptación y bloqueos concretos.

No modificar archivos ni datos. Si hace falta migración, solicitar aprobación arquitectónica antes de implementarla.

## 3. Diseñador: especificación UI (solo lectura)

Entrada: comentario del usuario, evidencia disponible y estilos existentes.

- Cargar las skills de diseño aplicables antes de actuar.
- Respetar paleta, tipografía, espaciados y breakpoints de AGENTS.md.
- Definir comportamiento móvil, escritorio, foco, teclado y estados vacíos/error.
- Distinguir side sheet, diálogo y bottom sheet; no sustituir uno por otro sin motivo.
- Revisar límites de ancho, contenedores de scroll y alturas reales del header.

Salida: especificación concisa y cambios localizados. No editar archivos compartidos con el desarrollador.

## 4. Desarrollador: implementación

- Integrar los resultados de auditoría y diseño.
- Leer la sección objetivo antes de editar; preferir sustituciones pequeñas con edit.
- No reescribir archivos completos ni acumular reglas CSS contradictorias al final.
- Mantener contratos, eventos y variables globales existentes.
- Sin frameworks ni paso de compilación nuevos.
- Un único responsable de escritura por archivo; delegar escrituras solo con ámbitos disjuntos.
- No usar datos de producción para pruebas destructivas.

Salida: archivos modificados, cambios relevantes y verificaciones realizadas.

## 5. Auditor: post-check independiente

- Revisar el diff, no solo el resumen del desarrollador.
- Comprobar sintaxis de los archivos JS modificados.
- Buscar errores de null, listeners duplicados, manejo de foco y regresiones.
- Verificar que el servidor entregue los archivos de la carpeta editada.
- Reutilizar el servidor activo correcto; para iniciar el servidor del proyecto, seguir dev:safe.
- No detener otros servidores ni cambiar puertos sin autorización.
- Verificar HTTP 200 y versión servida. HTTP 200 no demuestra corrección visual.
- Si hay navegador automatizable disponible, comprobar móvil y escritorio. Si no, indicar explícitamente que falta validación visual y ofrecer enlace Preview.
- Si hay fallos, devolverlos al desarrollador y repetir solo las comprobaciones afectadas.

Salida: APROBADO o CORREGIR, con evidencia y límites de verificación.

## 6. Cierre del orquestador

- Confirmar criterios de aceptación y recoger resultados de agentes y trabajos relevantes.
- Respuesta breve en español: resultado, pruebas reales, limitaciones y enlace HTTP(S) del servidor verificado.
- Enlazar archivos mencionados.
- Antes de una subida autorizada: git status y git diff --stat; incluir solo archivos intencionales.
- No hacer commit, push, merge, despliegue ni cambios de BD por defecto.

## Asignación y relevo de modelos

La matriz deseada está en AGENTS.md. La disponibilidad efectiva la determina list_subagent_models, no el nombre escrito en la guía.

Disponibilidad comprobada al crear esta guía:
- Proveedor: openai-codex
- Modelo: gpt-6.1-sol

Mientras solo exista ese modelo, usarlo para los agentes con contextos separados y roles distintos. No afirmar que se ejecutaron Astra, Luna, Terra o Gemini.

Si aparece un error de cuota:
1. Consultar los modelos realmente disponibles.
2. Elegir el siguiente compatible autorizado por la matriz, si existe.
3. Informar: [RELEVO]: cuota de A agotada; continuando con B.
4. Si no existe relevo disponible, informar el bloqueo sin inventar acceso ni repetir llamadas indefinidamente.

## Plantillas de delegación

### Auditoría previa
> Rol AUDITOR, solo lectura. Objetivo: {solicitud}. Raíz: {raíz confirmada}. Alcance: {archivos}. Lee las instrucciones aplicables. Identifica riesgos comprobados y pruebas de aceptación. No edites ni ejecutes cambios de BD. Devuelve restricciones y hallazgos con rutas y líneas.

### Diseño
> Rol DISEÑADOR, solo lectura. Objetivo: {solicitud}. Raíz: {raíz confirmada}. Evidencia: {comentarios/captura}. Carga las skills aplicables. Propón cambios localizados respetando AGENTS.md, móvil, teclado y foco. No edites. No afirmes haber visto la página sin evidencia visual.

### Auditoría final
> Rol AUDITOR POST-CHECK. Objetivo: {solicitud}. Archivos cambiados: {lista}. Revisa el diff y los criterios: {criterios}. Comprueba sintaxis y riesgos de regresión. No edites. Devuelve APROBADO o CORREGIR, con evidencia y pruebas pendientes.
