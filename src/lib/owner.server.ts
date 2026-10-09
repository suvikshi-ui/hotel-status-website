import { getSql } from "@/lib/db";
import { HOTEL } from "@/lib/hotels";

export async function assertOwner(userId: string): Promise<void> {
  const sql = await getSql();
  const rows = await sql.query<{ email: string }>(`select email from "user" where id = $1`, [userId]);
  const email = rows[0]?.email?.trim().toLowerCase() ?? "";
  if (email !== HOTEL.email.toLowerCase()) {
    throw new Error("This desk is only for the hotel owner.");
  }
}
