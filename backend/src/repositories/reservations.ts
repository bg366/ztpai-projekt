import { one, rows, type Db } from "../db.js";
import type { Page } from "../validation.js";
export const reservationSelect =
  "SELECT r.*,b.name AS boat_name,b.registration,u.name AS user_name,u.email AS user_email,p.code AS berth_code,p.status AS berth_status FROM reservations r JOIN boats b ON b.id=r.boat_id JOIN users u ON u.id=r.user_id JOIN berths p ON p.id=r.berth_id";
export class ReservationRepository {
  constructor(private db: Db) {}
  get(id: string, lock = false) {
    return one(
      this.db,
      `${reservationSelect} WHERE r.id=$1 ${lock ? "FOR UPDATE OF r" : ""}`,
      [id],
    );
  }
  async list(userId: string | null, p: Page) {
    const where =
        "($1::uuid IS NULL OR r.user_id=$1) AND ($2='' OR r.status=$2) AND (b.name ILIKE $3 OR p.code ILIKE $3 OR u.name ILIKE $3)",
      args = [userId, p.status, `%${p.search}%`];
    const total = (
      await rows(
        this.db,
        `SELECT count(*)::int AS total FROM (${reservationSelect} WHERE ${where}) q`,
        args,
      )
    )[0]!.total;
    const data = await rows(
      this.db,
      `${reservationSelect} WHERE ${where} ORDER BY ${p.sort === "name" ? "b.name ASC" : `r.starts_at ${p.sort === "oldest" ? "ASC" : "DESC"}`},r.id LIMIT $4 OFFSET $5`,
      [...args, p.limit, (p.page - 1) * p.limit],
    );
    return { data, total, page: p.page, limit: p.limit };
  }
  available(boat: Record<string, any>, start: Date, end: Date) {
    return rows(
      this.db,
      "SELECT p.* FROM berths p WHERE NOT p.archived AND p.status='AVAILABLE' AND p.max_length_cm >= $1 AND p.max_width_cm >= $2 AND p.max_draft_cm >= $3 AND NOT EXISTS(SELECT 1 FROM reservations r WHERE (r.berth_id=p.id OR r.boat_id=$6) AND r.status IN ('CONFIRMED','CHECKED_IN') AND tstzrange(r.starts_at,r.ends_at,'[)') && tstzrange($4::timestamptz,$5::timestamptz,'[)')) ORDER BY p.rate_cents,p.code",
      [boat.length_cm, boat.width_cm, boat.draft_cm, start, end, boat.id],
    );
  }
  create(input: {
    userId: string;
    boatId: string;
    berthId: string;
    start: Date;
    end: Date;
    rate: number;
    quoted: number;
  }) {
    return one(
      this.db,
      "INSERT INTO reservations(user_id,boat_id,berth_id,starts_at,ends_at,rate_cents,quoted_cents) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [
        input.userId,
        input.boatId,
        input.berthId,
        input.start,
        input.end,
        input.rate,
        input.quoted,
      ],
    );
  }
  async cancel(id: string) {
    await this.db.query(
      "UPDATE reservations SET status='CANCELLED' WHERE id=$1",
      [id],
    );
  }
  occupied(berth: string, id: string, boat: string) {
    return one(
      this.db,
      "SELECT id FROM reservations WHERE (berth_id=$1 OR boat_id=$3) AND status='CHECKED_IN' AND id!=$2",
      [berth, id, boat],
    );
  }
  async checkin(id: string, now: Date) {
    await this.db.query(
      "UPDATE reservations SET status='CHECKED_IN',checked_in_at=$2 WHERE id=$1",
      [id, now],
    );
  }
  async checkout(id: string, now: Date, cost: number) {
    await this.db.query(
      "UPDATE reservations SET status='COMPLETED',checked_out_at=$2,final_cents=$3 WHERE id=$1",
      [id, now, cost],
    );
  }
}
