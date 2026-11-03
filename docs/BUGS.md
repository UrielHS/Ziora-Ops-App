# Cómo trackear bugs de Ziora

Hoy no se registran en ningún lado. Propuesta en tres capas, de menos a más esfuerzo:

## 1. Captura manual en Ziora Ops (ya disponible)

Tabla `ops.bugs` con severidad, área, pasos, esperado y obtenido, dispositivo, versión y PR que lo corrige.
Cualquiera del equipo (QA de Rafa, demos, soporte) lo registra. Numeración `BUG-n`. Un bug con PR
enlazado pasa a `fixed` y, cuando QA lo confirma, a `verified`.

Severidad acordada:
- **critical**: nadie puede pagar, grabar o generar nota. Hoy el hotfix de Stripe sería crítico.
- **high**: una función principal falla para algunos usuarios o dispositivos (ej. compartir pantalla en iPad).
- **medium**: hay un rodeo posible.
- **low**: cosmético.

## 2. Botón "Reportar un problema" dentro de Ziora (recomendado ya)

El terapeuta describe el problema y el **backend** de Ziora (nunca el navegador, porque la llave es secreta)
hace `POST /api/bugs` con `Authorization: Bearer <BUG_INTAKE_KEY>`, adjuntando versión, ruta, navegador y correo del terapeuta.

**Regla dura:** el reporte no lleva nada clínico, ni transcripciones, ni notas, ni nombres de pacientes, ni
capturas de pantalla automáticas. Es información de salud bajo la LFPDPPP. Solo metadatos técnicos y el texto
que escriba el terapeuta, con un aviso de no incluir datos de pacientes.

## 3. Sentry para errores automáticos (siguiente paso)

El plan gratuito de Sentry (Developer) alcanza para empezar. Captura excepciones del frontend y del backend
con stack trace, sin que nadie las reporte. Configuración obligatoria por los datos clínicos:

```ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  replaysSessionSampleRate: 0,      // sin Session Replay: grabaría pantallas con datos de pacientes
  replaysOnErrorSampleRate: 0,
  beforeSend(event) {
    delete event.request?.data;     // cuerpos de request pueden traer notas o transcripciones
    delete event.request?.cookies;
    delete event.user?.ip_address;
    return event;
  },
});
```

Además activa en Sentry → Settings → Security & Privacy los scrubbers de datos sensibles.

Para conectarlo con Ziora Ops: Sentry → Alerts → una regla "issue nuevo" que llame a un webhook. Ese webhook
necesita un adaptador del formato de Sentry a `/api/bugs`, con `source: "sentry"` y `externalId` igual al
id del issue. Gracias a ese id, si el mismo error se repite, solo suma `occurrences` en lugar de crear
duplicados. El adaptador está pendiente para cuando se active Sentry.
