import { describe, expect, it } from "vitest";
import { parseCriteria, priorityScore, storyComplete, taskPriority, userStoryText } from "./tickets";

describe("priorityScore", () => {
  it("impacto alto y esfuerzo chico va primero", () => {
    expect(priorityScore(5, "s")).toBe(5);
    expect(priorityScore(5, "xl")).toBe(1);
    expect(priorityScore(2, "m")).toBe(1);
  });
  it("sin evaluar es 0", () => expect(priorityScore(null, "s")).toBe(0));
  it("se traduce a prioridad de tarea", () => {
    expect(taskPriority(5)).toBe("urgent");
    expect(taskPriority(2.5)).toBe("high");
    expect(taskPriority(1)).toBe("medium");
    expect(taskPriority(0.6)).toBe("low");
  });
});

describe("historia de usuario", () => {
  const story = { asA: "director clínico", iWant: "ver las notas pendientes de mi equipo", soThat: "dar seguimiento", acceptanceCriteria: ["Aparece un contador por terapeuta"] };
  it("completa con los tres campos y un criterio", () => {
    expect(storyComplete(story)).toBe(true);
    expect(storyComplete({ ...story, acceptanceCriteria: [" "] })).toBe(false);
    expect(storyComplete({ ...story, soThat: null })).toBe(false);
  });
  it("texto legible", () => {
    expect(userStoryText(story)).toBe(
      "Como director clínico, quiero ver las notas pendientes de mi equipo, para dar seguimiento.\n\nSabremos que está listo cuando:\n- Aparece un contador por terapeuta",
    );
  });
  it("criterios: uno por línea sin viñetas", () => {
    expect(parseCriteria("- uno\n2. dos\n\n• tres ")).toEqual(["uno", "dos", "tres"]);
  });
});
