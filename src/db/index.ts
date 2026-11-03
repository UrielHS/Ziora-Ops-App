import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as ops from "./schema";
import * as shared from "./shared";

function createClient() {
  const socketPath = process.env.DB_SOCKET_PATH; // Cloud Run: /cloudsql/PROJECT:REGION:INSTANCE
  if (socketPath) {
    return postgres({
      host: socketPath,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 5,
    });
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing environment variable: DATABASE_URL");
  return postgres(url, { max: 5 });
}

const globalForDb = globalThis as unknown as { __zioraOpsSql?: ReturnType<typeof postgres> };
const client = globalForDb.__zioraOpsSql ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.__zioraOpsSql = client;

export const db = drizzle(client, { schema: { ...shared, ...ops } });
export type Db = typeof db;
