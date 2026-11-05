/**
 * Postgres embebido (PGlite) para desarrollar y probar sin Docker.
 *
 *   npm run db:local          # escucha en localhost:5433, igual que docker compose
 *
 * La primera vez carga el schema public de Event Ops. Los datos quedan en dev/.pglite (ignorado por git).
 * Borra esa carpeta para empezar de cero.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

async function main() {
  const dataDir = process.env.PGLITE_DIR ?? join(__dirname, ".pglite"); // PGLITE_DIR: otra carpeta (p. ej. una base limpia para pruebas)
  const fresh = !existsSync(dataDir);
  const db = await PGlite.create(dataDir);
  if (fresh) {
    await db.exec(readFileSync(join(__dirname, "eventops-public-schema.sql"), "utf8"));
    console.log("Schema public de Event Ops cargado.");
  }
  const port = Number(process.env.PGLITE_PORT ?? 5433);
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
  await server.start();
  console.log(`PGlite escuchando en postgres://localhost:${port}/postgres`);
  process.on("SIGINT", async () => { await server.stop(); await db.close(); process.exit(0); });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
