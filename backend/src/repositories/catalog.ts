import { one,rows,type Db } from '../db.js';
import type { Page } from '../validation.js';
export class CatalogRepository {
 constructor(private db:Db){}
 boat(id:string,lock=false){return one(this.db,`SELECT * FROM boats WHERE id=$1 AND NOT archived ${lock?'FOR UPDATE':''}`,[id]);}
 berth(id:string,lock=false){return one(this.db,`SELECT * FROM berths WHERE id=$1 AND NOT archived ${lock?'FOR UPDATE':''}`,[id]);}
 async boats(owner:string,p:Page){
  const where='owner_id=$1 AND NOT archived AND (name ILIKE $2 OR registration ILIKE $2)',args=[owner,`%${p.search}%`];
  const sort=p.sort==='name'?'name ASC':`created_at ${p.sort==='oldest'?'ASC':'DESC'}`;
  return this.page('boats',where,args,sort,p);
 }
 async berths(p:Page){return this.page('berths',"NOT archived AND code ILIKE $1 AND ($2='' OR status=$2)",[`%${p.search}%`,p.status],p.sort==='name'?'code ASC':`created_at ${p.sort==='oldest'?'ASC':'DESC'}`,p);}
 async page(table:'boats'|'berths'|'users',where:string,args:unknown[],sort:string,p:Page,columns='*'){
  const count=await one(this.db,`SELECT count(*)::int AS total FROM ${table} WHERE ${where}`,args);
  const data=await rows(this.db,`SELECT ${columns} FROM ${table} WHERE ${where} ORDER BY ${sort},id LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,p.limit,(p.page-1)*p.limit]);
  return {data,total:count!.total,page:p.page,limit:p.limit};
 }
 createBoat(owner:string,b:Record<string,unknown>){return one(this.db,'INSERT INTO boats(owner_id,name,registration,length_cm,width_cm,draft_cm) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[owner,b.name,b.registration,b.length_cm,b.width_cm,b.draft_cm]);}
 updateBoat(id:string,b:Record<string,unknown>){return one(this.db,'UPDATE boats SET name=$2,registration=$3,length_cm=$4,width_cm=$5,draft_cm=$6 WHERE id=$1 RETURNING *',[id,b.name,b.registration,b.length_cm,b.width_cm,b.draft_cm]);}
 async archiveBoat(id:string){await this.db.query('UPDATE boats SET archived=true WHERE id=$1',[id]);}
 hasActiveBoatReservations(id:string){return one(this.db,"SELECT id FROM reservations WHERE boat_id=$1 AND status IN ('CONFIRMED','CHECKED_IN') LIMIT 1",[id]);}
 createBerth(b:Record<string,unknown>){return one(this.db,'INSERT INTO berths(code,max_length_cm,max_width_cm,max_draft_cm,rate_cents) VALUES($1,$2,$3,$4,$5) RETURNING *',[b.code,b.max_length_cm,b.max_width_cm,b.max_draft_cm,b.rate_cents]);}
 updateBerth(id:string,b:Record<string,unknown>){return one(this.db,'UPDATE berths SET code=$2,max_length_cm=$3,max_width_cm=$4,max_draft_cm=$5,rate_cents=$6 WHERE id=$1 RETURNING *',[id,b.code,b.max_length_cm,b.max_width_cm,b.max_draft_cm,b.rate_cents]);}
 hasActiveBerthReservations(id:string){return one(this.db,"SELECT id FROM reservations WHERE berth_id=$1 AND status IN ('CONFIRMED','CHECKED_IN') LIMIT 1",[id]);}
 async archiveBerth(id:string){await this.db.query('UPDATE berths SET archived=true WHERE id=$1',[id]);}
 status(id:string,status:string,reason:string){return one(this.db,'UPDATE berths SET status=$2,closure_reason=$3 WHERE id=$1 RETURNING *',[id,status,reason]);}
 openCritical(id:string){return one(this.db,"SELECT id FROM faults WHERE berth_id=$1 AND severity='CRITICAL' AND status!='RESOLVED' LIMIT 1",[id]);}
}
