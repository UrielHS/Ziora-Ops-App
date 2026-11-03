import { GoogleAuth } from "google-auth-library";
import { requireEnv } from "@/lib/env";

/**
 * Token que actúa como `subject` (p. ej. el CEO) mediante delegación de dominio, sin llaves descargadas.
 * Mismo patrón que Event Ops:
 *  1) firma el JWT con la API de IAM Credentials usando la identidad del servicio (ADC),
 *  2) lo cambia por un access token que actúa como `subject`.
 * La identidad de Cloud Run necesita roles/iam.serviceAccountTokenCreator sobre GOOGLE_INGEST_SA,
 * y el client ID de esa cuenta debe estar autorizado en Google Workspace con estos scopes.
 */
const TOKEN_URL = "https://oauth2.googleapis.com/token";
type Cached = { token: string; expiresAt: number };
const cache = new Map<string, Cached>();
const adc = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

export async function getDelegatedAccessToken(subject: string, scopes: string[]): Promise<string> {
  const key = `${subject}|${scopes.join(" ")}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt - now > 60_000) return hit.token;

  const serviceAccount = requireEnv("GOOGLE_INGEST_SA");
  const { token: callerToken } = await (await adc.getClient()).getAccessToken();
  if (!callerToken) throw new Error("No se obtuvo token de Application Default Credentials");

  const iat = Math.floor(now / 1000);
  const claims = { iss: serviceAccount, sub: subject, aud: TOKEN_URL, scope: scopes.join(" "), iat, exp: iat + 3600 };
  const signRes = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccount)}:signJwt`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${callerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ payload: JSON.stringify(claims) }),
    },
  );
  if (!signRes.ok) throw new Error(`signJwt falló (${signRes.status}): ${(await signRes.text()).slice(0, 300)}`);
  const { signedJwt } = (await signRes.json()) as { signedJwt: string };

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signedJwt }),
  });
  if (!tokenRes.ok) {
    const text = (await tokenRes.text()).slice(0, 300);
    const hint = text.includes("unauthorized_client")
      ? " — falta autorizar el client ID de la cuenta de servicio en Google Workspace (delegación de dominio) con el scope de Calendar."
      : "";
    throw new Error(`Intercambio de token delegado falló (${tokenRes.status}): ${text}${hint}`);
  }
  const data = (await tokenRes.json()) as { access_token: string; expires_in: number };
  cache.set(key, { token: data.access_token, expiresAt: now + data.expires_in * 1000 });
  return data.access_token;
}
