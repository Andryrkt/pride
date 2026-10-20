// Regroupe les scripts de migration et de données initiales en fichiers JS autonomes (image Docker).
import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] ?? path.join(root, "dist");
mkdirSync(out, { recursive: true });
await build({
  entryPoints: { migrate: path.join(root, "scripts/migrate.ts"), seed: path.join(root, "scripts/seed.ts") },
  outdir: out,
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["pg-native"],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: "warning",
});
cpSync(path.join(root, "migrations"), path.join(out, "migrations"), { recursive: true });
console.log(`Scripts regroupés dans ${out}`);
