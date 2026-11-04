import { describe, expect, it } from "vitest";
import { dayOfEndTime } from "./meta";

describe("dayOfEndTime", () => {
  it("el valor con end_time al cierre del día corresponde al día anterior en CDMX", () => {
    expect(dayOfEndTime("2026-11-03T06:00:00+0000")).toBe("2026-11-02");
    expect(dayOfEndTime("2026-07-15T06:00:00+0000")).toBe("2026-07-14");
  });
});
