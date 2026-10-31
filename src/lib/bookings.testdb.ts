import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const dir = new URL("../../migrations/", import.meta.url);

/** A throwaway in-memory Postgres with every booking migration applied. */
export async function freshDb(): Promise<PGlite> {
  const pg = new PGlite();
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const name of files) await pg.exec(readFileSync(new URL(name, dir), "utf8"));
  return pg;
}

export async function book(pg: PGlite, id: string, room: string, checkIn: string, checkOut: string, rooms = 1) {
  return pg.query(
    `select id from place_booking($1, 'Guest', '9076011515', 'guest@example.com', $2, $3::date, $4::date, 2, $5, 2499)`,
    [id, room, checkIn, checkOut, rooms],
  );
}
