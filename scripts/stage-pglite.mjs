import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dest = ".vercel/output/functions/__server.func/_libs";
if (!existsSync(dest)) {
  console.log("[pglite] no server bundle yet, skip");
  process.exit(0);
}

const src = "node_modules/@electric-sql/pglite/dist";
for (const name of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
  copyFileSync(join(src, name), join(dest, name));
}
console.log("[pglite] staged database files next to the server bundle");
