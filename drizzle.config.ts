import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Solo gestiona el schema "ops". Las tablas de "public" (contacts, users, events...)
// son de Event Ops y sus migraciones viven en ese repo. src/db/shared.ts NO se pasa aquí.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["ops"],
  migrations: { schema: "ops", table: "__drizzle_migrations" },
  dbCredentials: { url: process.env.DATABASE_URL! },
});
