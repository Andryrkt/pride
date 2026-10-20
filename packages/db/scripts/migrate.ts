import { migrate } from "drizzle-orm/node-postgres/migrator";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { db, closeDb } from "../src/index";

// En développement : packages/db/migrations ; dans l'image Docker : à côté du script regroupé.
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = process.env.MIGRATIONS_DIR ?? (existsSync(path.join(here, "migrations")) ? path.join(here, "migrations") : path.join(here, "..", "migrations"));
console.log("Application des migrations…");
await migrate(db, { migrationsFolder: dir });
console.log("Base de données à jour.");
await closeDb();
