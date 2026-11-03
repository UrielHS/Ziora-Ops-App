# Ziora Ops

Herramienta interna para operar Ziora: tareas tipo Jira, pipeline de demos, QA y bugs, PRs de GitHub,
correo masivo con plantillas HTML y contactos de psicólogos **compartidos con Event Ops**.

## Cómo se conecta con Event Ops

Comparte la misma instancia y base de Cloud SQL (`event-ops-509602 / event-ops-db / eventops`):

- `public.*` es de Event Ops. Ziora Ops lee usuarios y eventos, y crea o completa contactos y etiquetas.
  Nunca borra ni migra esas tablas. El espejo está en `src/db/shared.ts`.
- `ops.*` es de Ziora Ops. drizzle-kit solo ve `src/db/schema.ts` y solo migra ese schema.
- El login es el mismo Google OAuth y la misma tabla `users`: quien está activo en uno, entra al otro.

Puesta en marcha completa: **`docs/SETUP-CONEXION.md`**. El cambio que necesita Event Ops: `docs/event-ops-patch/`.

## Stack

El mismo que Event Ops: Node 22 · Next.js 15 · Drizzle + Postgres 16 · Auth.js v5 · Tailwind 4 · zod · Vitest.
Integraciones: Resend (correo) y Octokit (GitHub).

## Endpoints

| Ruta | Para qué | Autenticación |
|---|---|---|
| `POST /api/webhooks/demo` | Solicitudes de ziora-copilot.com/demo → demo y contacto compartido | HMAC `X-Ziora-Signature` |
| `POST /api/webhooks/github` | PRs y reviews en tiempo real | HMAC de GitHub |
| `POST /api/webhooks/resend` | Entregas, aperturas, rebotes y quejas | Firma Svix |
| `GET/POST /api/unsubscribe?t=` | Baja de correos (un clic, RFC 8058) | Token HMAC |
| `POST /api/bugs` | Reportes desde la app de Ziora o Sentry | Bearer `BUG_INTAKE_KEY` |
| `POST /api/jobs/sync-github` | Resincronización de PRs (Cloud Scheduler) | Bearer `JOB_SECRET` |
| `POST /api/jobs/sync-demos` | Lee demos del Google Calendar del CEO (cada 10 min) | Bearer `JOB_SECRET` |
| `POST /api/jobs/send-campaign` | Envía una campaña | Bearer `JOB_SECRET` |
| `GET /api/health` | Conexión a la BD y a ambos schemas | Pública, sin datos |

## Verlo funcionando en tu PC (5 minutos)

Requisitos: Node 22 y Docker Desktop.

```bash
cp .env.example .env     # ya trae DEV_LOGIN_EMAIL: entras sin Google
docker compose up -d     # Postgres en :5433 con el schema de Event Ops cargado
npm install
npm run db:setup         # migra el schema ops y siembra datos de ejemplo del brief GTM
npm run dev              # http://localhost:3001
```

Los datos de ejemplo son ficticios (correos @example.com). `DEV_LOGIN_EMAIL` solo funciona en desarrollo:
en producción se ignora y el login es con Google.

## Apartados

| Apartado | Qué hace |
|---|---|
| Dashboard | Bloqueos, KPIs, pipeline, sprint, PRs, bugs, próxima campaña y metas GTM; filtro por vista |
| Tareas | Tablero con arrastrar y soltar, lista, filtros por sprint/épica/persona, sprints, bloqueos |
| Demos | Pipeline arrastrable, embudo, registro manual, WhatsApp, trial día X/14, tarea de seguimiento |
| Contactos | Base compartida con Event Ops, filtros, etiquetas, permiso de correo con evidencia |
| Contenido | Calendario mensual, mezcla 60/25/15, cadencia semanal, checklist legal obligatoria para aprobar |
| Campañas | Segmentos sobre la base compartida, destinatarios con opt-in, vista previa, envío y resultados |
| Plantillas | Editor HTML con variables y vista previa en vivo (escritorio/móvil); exige enlace de baja |
| Eventos | Lectura de eventos de Event Ops e "Invitar por correo" |
| QA y bugs | Severidad, estado en línea, detalle, crear tarea desde bug, intake por API |
| Pull requests | PRs por repo con revisión y CI; sincronización manual o por webhook |
| Métricas | Metas día 30/60/90 (manuales o automáticas), demos por semana, embudo, contenido y correo |
| Ajustes | Estado de integraciones con URLs de webhooks, equipo (desde Event Ops) y épicas |

## Comandos

```bash
npm run dev          # http://localhost:3001
npm test             # unitarias; con RUN_DB_TESTS=1 y DATABASE_URL también las de integración
npm run typecheck
npm run db:generate  # migración nueva del schema ops
npm run db:migrate
```

## Estado

Hecho: todos los apartados funcionales sobre la base real, webhooks, envío de campañas con consentimiento y sincronización de PRs.

Siguiente:
- Activar la lectura del calendario del CEO (delegación de dominio, `docs/SETUP-CONEXION.md` §10).
- Primer despliegue (`docs/SETUP-CONEXION.md`).
- Adaptador de Sentry (`docs/BUGS.md`).
