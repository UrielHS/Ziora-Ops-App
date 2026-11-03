# Cambio en Event Ops: valores compartidos para Ziora Ops

Este cambio es aditivo: solo agrega valores a tres enums. No borra ni reescribe datos y se puede correr dos veces.
Haz una rama en Event Ops (`feat/ziora-ops-shared-contacts`), aplica los 4 cambios y abre un PR.
Al hacer merge a `main`, el deploy de Event Ops corre la migración.

## 1. Archivo nuevo `drizzle/0012_ziora_ops_shared.sql`

Copia tal cual `0012_ziora_ops_shared.sql`, que está en esta misma carpeta.

## 2. `drizzle/meta/_journal.json`: agrega la entrada al final de `entries`

```json
    {
      "idx": 12,
      "version": "7",
      "when": 1792400000000,
      "tag": "0012_ziora_ops_shared",
      "breakpoints": true
    }
```

Pon una coma después del `}` de la entrada 11.

## 3. `src/db/schema.ts`: tres enums

```ts
export const cityEnum = pgEnum("city", ["cdmx", "nyc", "other", "tbd", "gdl", "mty"]);
```

```ts
export const contactSourceEnum = pgEnum("contact_source", [
  "manual", "luma", "notion", "linkedin", "ai_tinkerers",
  // Ziora Ops
  "demo_form", "ziora_app", "facebook_group", "instagram", "csv_import",
]);
```

En `contactTagEnum`, agrega al final de la lista:

```ts
  // Ziora Ops
  "psychologist", "lead", "clinic", "ziora_user",
```

## 4. `src/lib/labels.ts`: etiquetas de los valores nuevos

```ts
export const CITY_LABELS = {
  cdmx: "CDMX", nyc: "NYC", other: "Other", tbd: "TBD", gdl: "Guadalajara", mty: "Monterrey",
} as const;
```

En `CONTACT_TAG_LABELS`, agrega:

```ts
  psychologist: "Psychologist", lead: "Lead", clinic: "Clinic", ziora_user: "Ziora user",
```

Después corre `npm run lint` y `npx tsc --noEmit`. Cualquier `switch` o mapa sobre ciudad o etiqueta que no
cubra los valores nuevos aparecerá ahí.

## Importante: no uses `npm run db:generate` para esto

En Event Ops, `drizzle/meta` solo tiene snapshots hasta la 0007. Las migraciones 0008 a 0011 se
escribieron a mano. Si corres `db:generate`, drizzle-kit compara contra la 0007 y vuelve a generar
los cambios de la 0008 a la 0011. Por eso esta migración también se escribe a mano, igual que las anteriores.

Lo recomendable es regenerar algún día el snapshot (`drizzle-kit pull` contra una base migrada) para que
`db:generate` vuelva a funcionar.

## Verificado

La secuencia 0000 a 0012 de Event Ops, más la migración de Ziora Ops con el usuario restringido `ziora_ops`,
se aplicó sobre un Postgres 16 limpio. También se probaron los webhooks de demo, bugs, GitHub y Resend, y la baja.
