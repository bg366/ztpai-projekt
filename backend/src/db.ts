import pg, { type Pool, type PoolClient, type QueryResultRow } from "pg";
export type Db = Pick<Pool | PoolClient, "query">;
export function createPool(url: string) {
  return new pg.Pool({ connectionString: url, max: 10 });
}
export async function rows<T extends QueryResultRow = Record<string, any>>(
  db: Db,
  sql: string,
  values: unknown[] = [],
): Promise<T[]> {
  return (await db.query<T>(sql, values)).rows;
}
export async function one<T extends QueryResultRow = Record<string, any>>(
  db: Db,
  sql: string,
  values: unknown[] = [],
): Promise<T | undefined> {
  return (await rows<T>(db, sql, values))[0];
}
export async function transaction<T>(
  pool: Pool,
  work: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
