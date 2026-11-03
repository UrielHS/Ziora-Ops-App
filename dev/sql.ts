// Consulta rápida a la base local: npx tsx dev/sql.ts "select ..."
import postgres from "postgres";
const s = postgres(process.env.DATABASE_URL!);
async function main() {
  const q = process.argv.slice(2).join(" ");
  console.table(await s.unsafe(q));
  await s.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
