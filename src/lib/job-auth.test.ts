import { afterEach, describe, expect, it } from "vitest";
import { isJobAuthorized } from "./job-auth";

const req = (auth?: string) => new Request("https://ops.example/api/jobs/x", { method: "POST", headers: auth ? { authorization: auth } : {} });

describe("autorización de tareas programadas", () => {
  const original = process.env.JOB_SECRET;
  afterEach(() => { process.env.JOB_SECRET = original; });

  it("acepta el secreto aunque se haya guardado con salto de línea de Windows", () => {
    process.env.JOB_SECRET = "abc123\r\n";
    expect(isJobAuthorized(req("Bearer abc123"))).toBe(true);
    expect(isJobAuthorized(req("bearer abc123 "))).toBe(true);
  });

  it("rechaza secretos distintos, vacíos o sin encabezado", () => {
    process.env.JOB_SECRET = "abc123";
    expect(isJobAuthorized(req("Bearer abc124"))).toBe(false);
    expect(isJobAuthorized(req("Bearer "))).toBe(false);
    expect(isJobAuthorized(req())).toBe(false);
    process.env.JOB_SECRET = "";
    expect(isJobAuthorized(req("Bearer "))).toBe(false);
  });
});
