import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { createPool, one, transaction } from "./db.js";
import { hashPassword } from "./services/auth.js";
export async function seed(pool: Pool, password: string) {
  if (password.length < 10)
    throw new Error("SEED_PASSWORD musi mieć co najmniej 10 znaków.");
  const hash = await hashPassword(password);
  await transaction(pool, async (db) => {
    for (const [email, name, role] of [
      ["admin@mazurport.local", "Anna Kowalska", "ADMIN"],
      ["obsluga@mazurport.local", "Piotr Nowak", "STAFF"],
      ["zeglarz@mazurport.local", "Jan Mazur", "SAILOR"],
    ])
      await db.query(
        "INSERT INTO users(email,name,role,password_hash) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING",
        [email, name, role, hash],
      );
    const owner = (await one(
      db,
      "SELECT id FROM users WHERE email='zeglarz@mazurport.local'",
    ))!;
    await db.query(
      "INSERT INTO boats(owner_id,name,registration,length_cm,width_cm,draft_cm) VALUES($1,'Błękitna','POL-2401',850,280,140),($1,'Szanta','POL-2402',1020,340,180) ON CONFLICT(registration) DO NOTHING",
      [owner.id],
    );
    for (let i = 1; i <= 12; i++)
      await db.query(
        "INSERT INTO berths(code,max_length_cm,max_width_cm,max_draft_cm,rate_cents) VALUES($1,$2,$3,$4,$5) ON CONFLICT(code) DO NOTHING",
        [
          `${i <= 6 ? "A" : "B"}-${String(((i - 1) % 6) + 1).padStart(2, "0")}`,
          i <= 6 ? 1000 : 1400,
          i <= 6 ? 320 : 450,
          i <= 6 ? 170 : 250,
          i <= 6 ? 6500 : 9500,
        ],
      );
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { config } = await import("./config.js");
  const pool = createPool(config.DATABASE_URL);
  try {
    const password = process.env.SEED_PASSWORD;
    if (!password)
      throw new Error("Ustaw SEED_PASSWORD dla kont demonstracyjnych.");
    await seed(pool, password);
    console.log(
      "Dane demonstracyjne gotowe. Istniejące konta pozostawiono bez zmian.",
    );
  } finally {
    await pool.end();
  }
}
