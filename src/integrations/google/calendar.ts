import type { RawCalendarEvent } from "@/domain/demo-calendar";
import { getDelegatedAccessToken } from "./auth";

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";

/**
 * Lee del calendario del CEO solo los eventos que coinciden con DEMO_EVENT_MATCH (búsqueda `q` de Google).
 * Incluye cancelados (showDeleted) para reflejar cancelaciones en el pipeline.
 */
export async function listDemoEvents(opts: { subject: string; calendarId: string; match: string; timeMin: Date; timeMax: Date }) {
  const token = await getDelegatedAccessToken(opts.subject, [CALENDAR_SCOPE]);
  const out: RawCalendarEvent[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      timeMin: opts.timeMin.toISOString(),
      timeMax: opts.timeMax.toISOString(),
      singleEvents: "true",
      showDeleted: "true",
      maxResults: "250",
      q: opts.match,
      ...(pageToken ? { pageToken } : {}),
    });
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(opts.calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as { items?: RawCalendarEvent[]; nextPageToken?: string };
    out.push(...(body.items ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return out;
}
