import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts"],
    // Las pruebas con base de datos (RUN_DB_TESTS=1) pueden tardar más, sobre todo con PGlite.
    testTimeout: process.env.RUN_DB_TESTS === "1" ? 30_000 : 5_000,
  },
});
