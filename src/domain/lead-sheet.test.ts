import { describe, expect, it } from "vitest";
import { leadTags, parseLeadSheet } from "./lead-sheet";

// Mismo formato que la hoja "Leads Ziora MTW" (datos ficticios).
const CSV = `Prioridad,Segmento,Flag B2B,Nombre,Email,Teléfono,Rol,Pacientes/sem,Enfoque,Documentación,Usa IA,Ciudad,Registrado Panel,Asistió Panel,Registrado Taller,Asistió Taller,Ticket Panel
1,🔥 HOT,,Ana Prueba,Ana.Prueba@Example.com,525500000001,Psicólogo/a en práctica privada independiente,1 a 5,TCC o terapias de tercera generación,"Word, Docs o Notas","No, pero quiero",Ciudad de México,Sí,Sí,Sí,Sí,Presencial
2,❄️ COLD,⭐ Director,Beto Prueba,beto@example.com,525500000002,Director/a o coordinador/a de clínica,0,Sistémico,En papel o libreta,"No, pero quiero",Guadalajara,Sí,,,,Virtual
4,❄️ COLD,,Caro Estudiante,caro@example.com,525500000003,Estudiante sin pacientes,0,Otro,,,cdmx,Sí,,,,
5,💻 COLD-Virtual,,Sin Correo,,525500000004,,,,,,,,,,,
5,💻 COLD-Virtual,,Ana Repetida,ana.prueba@example.com,525500000005,,,,,,,,,,,
`;

describe("hoja de leads", () => {
  const r = parseLeadSheet(CSV);

  it("lee el formato tal cual y normaliza el correo", () => {
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0]).toEqual({
      line: 2, email: "ana.prueba@example.com", name: "Ana Prueba", phone: "525500000001", approach: "TCC o terapias de tercera generación",
      jobTitle: "Psicólogo/a en práctica privada independiente", patientsPerWeek: "1 a 5",
      documentation: "Word, Docs o Notas", aiUsage: "No, pero quiero", cityName: "Ciudad de México",
    });
  });

  it("solo toma de Nombre a Ciudad; las demás columnas se ignoran", () => {
    expect(r.ignoredColumns).toEqual(["Prioridad", "Segmento", "Flag B2B", "Registrado Panel", "Asistió Panel", "Registrado Taller", "Asistió Taller", "Ticket Panel"]);
    expect(Object.keys(r.rows[1])).not.toContain("segment");
  });

  it("salta filas sin correo y correos repetidos, diciendo cuál", () => {
    expect(r.skipped).toEqual([
      { line: 5, reason: "sin correo" },
      { line: 6, reason: "correo repetido en la hoja (ana.prueba@example.com)" },
    ]);
  });

  it("deduce etiquetas: lead siempre; psicólogo y clínica según el Rol", () => {
    expect(leadTags(r.rows[0]).sort()).toEqual(["lead", "psychologist"]);
    expect(leadTags(r.rows[1]).sort()).toEqual(["clinic", "lead", "psychologist"]);
    expect(leadTags(r.rows[2])).toEqual(["lead"]); // estudiante: no es psicólogo todavía
  });

  it("exige las columnas Email y Nombre", () => {
    expect(() => parseLeadSheet("Nombre,Teléfono\nAna,1")).toThrow("Email");
  });
});
