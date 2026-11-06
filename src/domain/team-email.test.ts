import { describe, expect, it } from "vitest";
import { isTeamEmail } from "./demos";

describe("correos del equipo", () => {
  it("reconoce el dominio del equipo, con alias y mayúsculas", () => {
    expect(isTeamEmail("chris+demotest@ziora-copilot.com")).toBe(true);
    expect(isTeamEmail(" Uriel@Ziora-Copilot.com ")).toBe(true);
  });
  it("no confunde otros dominios", () => {
    expect(isTeamEmail("psic@gmail.com")).toBe(false);
    expect(isTeamEmail("alguien@ziora-copilot.com.mx")).toBe(false);
    expect(isTeamEmail("x@notziora-copilot.com")).toBe(false);
  });
});
