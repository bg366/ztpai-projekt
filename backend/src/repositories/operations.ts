import { one, rows, type Db } from "../db.js";
import type { Page } from "../validation.js";
export class OperationsRepository {
  constructor(private db: Db) {}
  async faults(userId: string | null, p: Page) {
    const base =
        "FROM faults f JOIN berths b ON b.id=f.berth_id JOIN users u ON u.id=f.reporter_id WHERE ($1::uuid IS NULL OR f.reporter_id=$1) AND ($2='' OR f.status=$2) AND (f.description ILIKE $3 OR b.code ILIKE $3)",
      args = [userId, p.status, `%${p.search}%`];
    const count = await one(
      this.db,
      `SELECT count(*)::int AS total ${base}`,
      args,
    );
    const data = await rows(
      this.db,
      `SELECT f.*,b.code AS berth_code,u.name AS reporter_name ${base} ORDER BY f.created_at ${p.sort === "oldest" ? "ASC" : "DESC"},f.id LIMIT $4 OFFSET $5`,
      [...args, p.limit, (p.page - 1) * p.limit],
    );
    return { data, total: count!.total, page: p.page, limit: p.limit };
  }
  createFault(
    berth: string,
    user: string,
    description: string,
    severity: string,
  ) {
    return one(
      this.db,
      "INSERT INTO faults(berth_id,reporter_id,description,severity) VALUES($1,$2,$3,$4) RETURNING *",
      [berth, user, description, severity],
    );
  }
  fault(id: string, lock = false) {
    return one(
      this.db,
      `SELECT * FROM faults WHERE id=$1 ${lock ? "FOR UPDATE" : ""}`,
      [id],
    );
  }
  updateFault(
    id: string,
    status: string,
    resolution: string,
    actor: string,
    now: Date,
  ) {
    return one(
      this.db,
      "UPDATE faults SET status=$2,resolution=$3,resolved_by=CASE WHEN $2='RESOLVED' THEN $4::uuid ELSE NULL END,resolved_at=CASE WHEN $2='RESOLVED' THEN $5::timestamptz ELSE NULL END WHERE id=$1 RETURNING *",
      [id, status, resolution, actor, now],
    );
  }
  user(id: string) {
    return one(
      this.db,
      "SELECT id,name,email,role,active FROM users WHERE id=$1",
      [id],
    );
  }
  async lockAdmins() {
    await this.db.query("SELECT pg_advisory_xact_lock(724002)");
  }
  admins() {
    return rows(this.db, "SELECT id FROM users WHERE role='ADMIN' AND active");
  }
  async updateUser(id: string, role: string, active: boolean) {
    await this.db.query("DELETE FROM sessions WHERE user_id=$1", [id]);
    return one(
      this.db,
      "UPDATE users SET role=$2,active=$3 WHERE id=$1 RETURNING id,name,email,role,active",
      [id, role, active],
    );
  }
  async activity(p: Page) {
    const count = await one(
      this.db,
      "SELECT count(*)::int AS total FROM audit_events",
    );
    const data = await rows(
      this.db,
      "SELECT a.*,u.name AS actor_name FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT $1 OFFSET $2",
      [p.limit, (p.page - 1) * p.limit],
    );
    return { data, total: count!.total, page: p.page, limit: p.limit };
  }
  async notifications(user: string, p: Page) {
    const count = await one(
      this.db,
      "SELECT count(*)::int AS total FROM notifications WHERE user_id=$1",
      [user],
    );
    const data = await rows(
      this.db,
      "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT $2 OFFSET $3",
      [user, p.limit, (p.page - 1) * p.limit],
    );
    return { data, total: count!.total, page: p.page, limit: p.limit };
  }
  readNotification(id: string, user: string, now: Date) {
    return one(
      this.db,
      "UPDATE notifications SET read_at=COALESCE(read_at,$3) WHERE id=$1 AND user_id=$2 RETURNING *",
      [id, user, now],
    );
  }
  async dashboard(user: string | null) {
    return one(
      this.db,
      `SELECT (SELECT count(*)::int FROM berths WHERE NOT archived AND status='AVAILABLE') AS available_berths,(SELECT count(*)::int FROM reservations WHERE status='CONFIRMED' AND ($1::uuid IS NULL OR user_id=$1)) AS upcoming,(SELECT count(*)::int FROM reservations WHERE status='CHECKED_IN' AND ($1::uuid IS NULL OR user_id=$1)) AS checked_in,(SELECT count(*)::int FROM faults WHERE status!='RESOLVED' AND ($1::uuid IS NULL OR reporter_id=$1)) AS open_faults`,
      [user],
    );
  }
}
