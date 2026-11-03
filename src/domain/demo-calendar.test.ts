import { describe, expect, it } from "vitest";
import { extractAnswers, parseDemoEvent, type RawCalendarEvent } from "./demo-calendar";

const CEO = "chris@ziora-copilot.com";

describe("parseDemoEvent", () => {
  it("formato de Programación de citas de Google", () => {
    const e: RawCalendarEvent = {
      id: "abc123",
      status: "confirmed",
      summary: "Demo Ziora (Andrea Ruiz)",
      start: { dateTime: "2026-10-30T11:00:00-06:00" },
      organizer: { email: CEO, self: true },
      attendees: [
        { email: CEO, organizer: true, self: true },
        { email: "Andrea.Ruiz@example.com", displayName: "Andrea Ruiz" },
      ],
      description:
        "Reservado por<br>Andrea Ruiz<br>andrea.ruiz@example.com<br>+52 55 1234 5678<br><br>Pacientes por semana<br>10-20<br><br>¿Atiendes por teleterapia?<br>Sí<br><br>¿Qué es lo que más te quita tiempo hoy?<br>Escribir notas en la noche",
      htmlLink: "https://calendar.google.com/event?eid=x",
    };
    const p = parseDemoEvent(e, [CEO])!;
    expect(p.externalId).toBe("gcal:abc123");
    expect(p.email).toBe("andrea.ruiz@example.com");
    expect(p.fullName).toBe("Andrea Ruiz");
    expect(p.whatsapp).toBe("+52 55 1234 5678");
    expect(p.patientsPerWeek).toBe("10-20");
    expect(p.teletherapy).toBe("Sí");
    expect(p.painPoint).toBe("Escribir notas en la noche");
    expect(p.scheduledAt?.toISOString()).toBe("2026-10-30T17:00:00.000Z");
    expect(p.cancelled).toBe(false);
  });

  it("descripción propia con 'Etiqueta: valor'", () => {
    const e: RawCalendarEvent = {
      id: "def456",
      summary: "Demo Ziora – Luis Treviño",
      start: { dateTime: "2026-11-02T16:30:00-06:00" },
      organizer: { email: CEO },
      attendees: [{ email: "luis@example.com" }],
      description: "Nombre completo: Luis Treviño\nWhatsApp: +52 81 5555 0000\nPacientes por semana: 21-30\n¿Atiendes por teleterapia?: No\nCiudad: Monterrey",
    };
    const p = parseDemoEvent(e, [CEO])!;
    expect(p.fullName).toBe("Luis Treviño");
    expect(p.whatsapp).toBe("+52 81 5555 0000");
    expect(p.teletherapy).toBe("No");
    expect(p.city).toBe("Monterrey");
  });

  it("cancelado se marca como tal", () => {
    const p = parseDemoEvent({ id: "z", status: "cancelled", attendees: [{ email: "x@example.com" }], organizer: { email: CEO } }, [CEO])!;
    expect(p.cancelled).toBe(true);
  });

  it("ignora eventos sin invitado externo (juntas internas)", () => {
    expect(parseDemoEvent({ id: "int", summary: "Demo interna", organizer: { email: CEO }, attendees: [{ email: CEO, self: true }] }, [CEO])).toBeNull();
  });

  it("extractAnswers no confunde respuestas con preguntas", () => {
    expect(extractAnswers("Pacientes por semana\n10-20\nCiudad\nGuadalajara")).toMatchObject({ patientsPerWeek: "10-20", city: "Guadalajara" });
  });
});
