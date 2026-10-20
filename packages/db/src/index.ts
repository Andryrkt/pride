import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export * from "./schema";
export { schema };
export * from "drizzle-orm";

const globalForDb = globalThis as unknown as { pridePool?: Pool };

const pool =
  globalForDb.pridePool ??
  new Pool({
    connectionString: process.env.DATABASE_URL ?? "postgresql://pride:pride@localhost:5432/pride",
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pridePool = pool;

/** Connexion Drizzle partagée par l'application web et les scripts. */
export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Incrémente un compteur et renvoie la nouvelle valeur (numéros de membre, reçus…). */
export async function nextCounter(key: string, executor: Db | Tx = db): Promise<number> {
  const { sql } = await import("drizzle-orm");
  const res = await executor.execute<{ value: number }>(
    sql`insert into counters (key, value) values (${key}, 1)
        on conflict (key) do update set value = counters.value + 1
        returning value`,
  );
  return Number(res.rows[0]!.value);
}

export async function closeDb() {
  await pool.end();
}
