import { describe, expect, it } from "vitest";
import { hmacSha256Hex, readUnsubscribeToken, unsubscribeToken, verifyHmac } from "./crypto";

describe("verifyHmac", () => {
  it("acepta firma válida con y sin prefijo", () => {
    const sig = hmacSha256Hex("s", "body");
    expect(verifyHmac("s", "body", sig)).toBe(true);
    expect(verifyHmac("s", "body", `sha256=${sig}`)).toBe(true);
  });
  it("rechaza firma inválida o ausente", () => {
    expect(verifyHmac("s", "body", "deadbeef")).toBe(false);
    expect(verifyHmac("s", "body", null)).toBe(false);
  });
});

describe("unsubscribe token", () => {
  it("ida y vuelta", () => {
    const t = unsubscribeToken("k", "abc-123");
    expect(readUnsubscribeToken("k", t)).toBe("abc-123");
    expect(readUnsubscribeToken("otra", t)).toBeNull();
    expect(readUnsubscribeToken("k", "abc-123.xxxx")).toBeNull();
  });
});

describe("encryptSecret", () => {
  it("cifra y descifra; detecta manipulación", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    process.env.SOCIAL_TOKEN_KEY = Buffer.alloc(32, 7).toString("base64");
    const enc = encryptSecret("EAAB-token-secreto");
    expect(enc).not.toContain("EAAB");
    expect(decryptSecret(enc)).toBe("EAAB-token-secreto");
    const parts = enc.split(".");
    parts[3] = Buffer.from("otro").toString("base64");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });
});
