# Prompt para generar la vista del Dashboard de Ziora Ops

Paleta tomada de ziora-copilot.com, sobre la base de layout de Event Ops. El hero usa el degradado menta
del sitio en lugar del bloque negro de Event Ops: así se distingue a primera vista en qué sistema estás.

```
Diseña la vista Dashboard de "Ziora Ops", la herramienta interna de operación del equipo de Ziora (copiloto clínico con IA para psicólogos en México). Es un SaaS de escritorio, en español, que combina Jira, un CRM y marketing ops. Genera un solo archivo HTML con Tailwind (CDN), fuente Plus Jakarta Sans e iconos Lucide (trazo 1.5, sin relleno). Usa datos ficticios pero realistas, sin datos de pacientes.

IDENTIDAD (de ziora-copilot.com)
- Logo: un pájaro martín pescador estilizado en verde petróleo #1F4A45 junto al wordmark "Ziora" en el mismo color, más "Ops" en gris #9CA3AF.
- Firma visual: degradado menta suave (#B9EED0 → #D4F5EC → #C8F1EA, diagonal) con círculos grandes de línea blanca fina (1.5px, 50% de opacidad) que se salen del contenedor. Úsalo SOLO en el hero y en estados vacíos.
- Botón primario: cápsula verde bosque #4E6B5C con texto blanco (hover #405A4D). Botón secundario: cápsula con borde 1px #4E6B5C, texto #1F4A45 y fondo transparente. Botón terciario: blanco, con texto oscuro y flecha →.
- Títulos en #1A2520, peso 700–800. Subtítulos en verde apagado #4F6F5F, peso 600.
- Tono cálido y clínico. Microcopy en español de México.

BASE DE LA INTERFAZ
- Fondo general crema #F7F6F0. Tarjetas blancas #FFFFFF con borde de 1px #E7E5DC y sin sombras pesadas.
- Acento de selección: fondo #E2F3EC, texto o icono activo #059669.
- Texto secundario #4B5563 y terciario #9CA3AF.
- Radios: 24px en contenedores grandes, 16px en tarjetas y 999px en botones y badges.
- Etiquetas en MAYÚSCULAS de 11px con tracking 0.08em. Cifras de KPI en 32px bold.
- Badges tipo cápsula de 11px: verde (#E2F3EC/#059669) para Confirmado, Merged o Pagó; gris (#F1F0EA/#4B5563) para Pendiente o Draft; ámbar (#FDF4E3/#A15C07) para En revisión o Trial; rojo suave (#FDECEC/#B42318) para Bloqueante o Crítico.

LAYOUT
1. Sidebar izquierda de 240px, fondo crema, sin borde fuerte. Logo arriba. Grupos con su etiqueta:
   - OPERACIÓN: Dashboard (activo, en cápsula menta), Tareas, Sprints
   - VENTAS: Demos, Contactos (con el badge pequeño "Event Ops" y un icono de enlace, porque la base es compartida)
   - MARKETING: Calendario de contenido, Campañas, Plantillas, Eventos (con el badge "Event Ops")
   - PRODUCTO: QA y bugs, Pull requests
   - Al final: Métricas, Ajustes y el avatar "Uriel · Operator"
2. Barra superior del contenido: búsqueda global con el atajo ⌘K a la izquierda. A la derecha, la campana de notificaciones y el botón primario "+ Nuevo", con un menú de Tarea, Demo, Bug, Campaña y Contacto.
3. Hero (radio 24px, degradado menta con círculos blancos de línea):
   - Fecha pequeña en #4F6F5F: "Lunes, 19 de octubre de 2026 · Semana 2 de 13 del plan GTM"
   - Saludo "Buenos días, Uriel" en #1A2520, 32px, peso 800
   - El texto "Operación, ventas y producto de Ziora en un solo lugar."
   - A la derecha, un dropdown blanco con borde fino: "Vista: Toda la operación ▾" (opciones: Producto, GTM, Ventas)
4. Franja de bloqueos: tarjeta blanca con borde izquierdo de 4px #B42318 y el título "BLOQUEOS ACTIVOS · 2". Dos filas:
   - "Hotfix de Stripe en despliegue: los checkouts fallan desde el 29-sep" · badge Bloqueante · nota "Sin campañas de pago ni de upgrade" · responsable Chris
   - "La landing dice 5 sesiones gratis; el código da 10" · badge Ingeniería · nota "Corregir antes de publicar precios" · enlace al PR #221
5. Fila de 6 KPI cards. Cada una lleva etiqueta, cifra, nota e icono en un círculo sutil arriba a la derecha:
   DEMOS ESTA SEMANA 7 (+3 vs la anterior) · TAREAS ABIERTAS 34 (9 vencen esta semana) · BUGS ABIERTOS 5 (1 crítico) · PRS PENDIENTES 4 (2 esperan revisión) · PSICÓLOGOS EN BASE 412 (compartidos con Event Ops) · CON PERMISO DE CORREO 186 (opt-in).
   Destaca la de demos con fondo #E2F3EC y borde #059669 al 40%.
6. Grid principal de 2 columnas (2/3 + 1/3).
   IZQUIERDA
   a) Panel "Pipeline de demos" con el enlace "Ver todo ↗". Kanban horizontal con scroll de 6 columnas: Solicitada · Agendada · Realizada · En trial · Pagó · Perdida. Cada tarjeta lleva:
      - nombre (Psic. Andrea Ruiz) y ciudad (CDMX, GDL o MTY)
      - "18 pacientes/sem", el badge "Teleterapia" y la fecha u hora
      - "Origen: ziora-copilot.com/demo" y un icono de WhatsApp
      En "En trial", una barra delgada "Día 6 de 14".
   b) Panel "Sprint actual · Semana 2 (12–25 oct)" estilo Jira. Filas de tarea con:
      - ID (ZOP-112), título y épica como badge de color (GTM, Producto, QA, Ventas)
      - avatar del asignado (Ale, Uriel, Paulina, J, Chris, Rafa), prioridad y estado
      Tareas de ejemplo: "Banco de 30 piezas para IG y TikTok", "Lista de 10–15 grupos de Facebook", "Video demo corto", "Pedir testimonio a Rafa", "Página de seguridad propia", "Revisar el testimonio de Cardiel". Al final, la barra del sprint "14 de 31 tareas".
   DERECHA
   c) "Pull requests": 4 filas con el repo en gris, #número, título, autor, badge (Abierto, En revisión o Draft) y estado de CI (✓ verde o ✗ rojo). Ejemplos: "#218 fix(stripe): webhook idempotente", "#221 fix(landing): 10 sesiones en plan gratis".
   d) "QA y bugs": 5 filas con BUG-n, severidad, área (Checkout, Compartir pantalla en iPad, Referidos, Grabación, Portal) y estado. Abajo, el enlace "Reportar bug".
   e) "Próxima campaña": tarjeta con una miniatura de la plantilla HTML (encabezado con degradado menta y el logo), el asunto "Te invitamos a Demo Night · CDMX", el segmento "Psicólogos CDMX · con opt-in · 186", el estado Borrador y los botones "Editar plantilla" y "Vista previa".
7. Banda inferior de ancho completo, "Metas GTM a 90 días": 4 mini tarjetas con barra de progreso, meta y día (Seguidores IG 182/300 · Altas 6/15 · Demos 9/5 ✓ · Aportes en grupos de FB 11/25).

DETALLES
- Las tarjetas del pipeline terminan con el enlace "Ver detalle ↗".
- Al pasar el cursor sobre el badge "Event Ops" aparece un tooltip: "Esta base es la misma que usa Event Ops. Los cambios se ven en ambos sistemas."
- Estados vacíos: el degradado menta con un círculo y un texto amable.
- Responsivo: en móvil la sidebar se colapsa a iconos, las KPI pasan a 2 columnas y el grid a 1.
- No uses tablas pesadas: filas tipo lista con separadores finos de #EFEDE6.
```
