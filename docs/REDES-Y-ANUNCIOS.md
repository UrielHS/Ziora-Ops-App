# Redes sociales y campañas pagadas

| Red | Orgánico | Anuncios | Cómo entra |
|---|---|---|---|
| Instagram | Seguidores, alcance, vistas, interacción, visitas al perfil, clics; publicaciones | Meta Ads | API de Meta, cada mañana |
| Facebook (página) | Seguidores, alcance, interacción, vistas de página | Meta Ads | API de Meta, cada mañana |
| TikTok | Lo que exporte TikTok Studio | TikTok Ads Manager | CSV (hasta tener la app aprobada) |
| LinkedIn | Lo que exporte Page Analytics | Campaign Manager | CSV (la API de LinkedIn requiere aprobación, suele tardar semanas) |

Si las aprobaciones de TikTok o LinkedIn se atoran, un agregador (Windsor.ai, Supermetrics, Coupler) puede
exportar un CSV diario con las mismas columnas y se importa igual.

## 1. Llave para cifrar tokens

```bash
openssl rand -base64 32 | gcloud secrets create ziora-ops-social-token-key --data-file=- --project=event-ops-509602
gcloud run services update ziora-ops --region us-central1 --project event-ops-509602 \
  --update-secrets SOCIAL_TOKEN_KEY=ziora-ops-social-token-key:latest
```

Si se pierde o cambia la llave, los tokens guardados ya no se pueden leer: hay que volver a pegarlos.

## 2. Token de Meta (Instagram, Facebook y Ads)

1. Business Manager → Configuración del negocio → **Usuarios del sistema** → crear uno (rol administrador).
2. Asignarle activos: la página de Facebook, la cuenta de Instagram y la cuenta publicitaria.
3. Generar token con la app de Meta del negocio y permisos: `instagram_basic`, `instagram_manage_insights`,
   `pages_read_engagement`, `read_insights`, `ads_read`. Los tokens de usuario del sistema no caducan.
4. En Ziora Ops → **Redes sociales → + Cuenta**:
   - Instagram: *ID de la cuenta* = IG user id (Graph API Explorer: `me/accounts?fields=instagram_business_account`).
   - Facebook: *ID de la cuenta* = page id.
   - *Cuenta publicitaria* = `act_…` (en una sola de las cuentas, para no duplicar campañas).
5. **Sincronizar ahora** para probar. Si Meta retiró alguna métrica, aparece como aviso en la cuenta y el resto sigue.

La cuenta de Instagram/Facebook y la publicitaria deben estar en **hora de CDMX** y la publicitaria en **MXN**.

## 3. Sincronización diaria

```bash
gcloud scheduler jobs create http ziora-ops-sync-social --location us-central1 --project event-ops-509602 \
  --schedule "0 6 * * *" --time-zone "America/Mexico_City" --http-method POST --uri "$URL/api/jobs/sync-social" \
  --headers "Authorization=Bearer $(gcloud secrets versions access latest --secret=ziora-ops-job-secret --project event-ops-509602)"
```

Cada corrida re-lee los últimos 3 días porque las plataformas ajustan cifras recientes.

## 4. Importar CSV (TikTok, LinkedIn, agregadores)

**Redes sociales → Importar CSV.** Columnas reconocidas, en español o inglés:

- Orgánico: `fecha` + cualquiera de `seguidores`, `alcance`, `impresiones`/`visualizaciones`, `interacciones`,
  `visitas al perfil`, `clics en el enlace`.
- Anuncios: `fecha`, `campaña`, `gasto` (obligatorias) + `id de campaña`, `impresiones`, `clics`, `leads`/`resultados`, `conversiones`.

Acepta separador `,` o `;`, números `1,234.5` o `1.234,5` y fechas `2026-11-03` o `03/11/2026`.
Reimportar un periodo actualiza, no duplica.

## 5. Costo real por demo

Las demos guardan los UTM con los que llegaron. En **Anuncios → UTM** escribe el `utm_campaign` que usan los
enlaces de cada campaña (por ejemplo `demo-psicologos-gdl`). Con eso:

- **Costo por demo** = gasto ÷ demos que llegaron con ese utm.
- **Costo por cliente** = gasto ÷ esas demos que terminaron en "Pagó".

Así se compara lo que dice la plataforma (CPL) contra lo que de verdad llega al pipeline.
