import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { createPool } from './db.js';
export async function migrate(pool:Pool){
 const db=await pool.connect();
 try {
  await db.query('SELECT pg_advisory_lock(724001)');
  await db.query('CREATE TABLE IF NOT EXISTS migrations(name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
  const dir=fileURLToPath(new URL('../migrations/',import.meta.url));
  for(const name of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort()){
   if((await db.query('SELECT 1 FROM migrations WHERE name=$1',[name])).rowCount)continue;
   await db.query('BEGIN');
   try {await db.query(await readFile(resolve(dir,name),'utf8'));await db.query('INSERT INTO migrations(name) VALUES($1)',[name]);await db.query('COMMIT');}
   catch(e){await db.query('ROLLBACK');throw e;}
  }
 } finally {await db.query('SELECT pg_advisory_unlock(724001)');db.release();}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {config}=await import('./config.js');const pool=createPool(config.DATABASE_URL);
 try {await migrate(pool);console.log('Migracje wykonane.');}finally{await pool.end();}
}
