import type { Db } from '../db.js';
import { one } from '../db.js';
import type { User } from '../types.js';
export const publicUser='id,email,name,role,active';
export class AuthRepository {
 constructor(private db:Db){}
 findEmail(email:string){return one<User & {password_hash:string}>(this.db,'SELECT * FROM users WHERE email=$1',[email]);}
 create(name:string,email:string,hash:string){return one<User>(this.db,`INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING ${publicUser}`,[name,email,hash]);}
 async session(userId:string,tokenHash:string,csrf:string,expires:Date){return one<{id:string}>(this.db,'INSERT INTO sessions(user_id,token_hash,csrf_token,expires_at) VALUES($1,$2,$3,$4) RETURNING id',[userId,tokenHash,csrf,expires]);}
 findSession(hash:string,now:Date){return one<User & {session_id:string;csrf_token:string}>(this.db,'SELECT u.id,u.email,u.name,u.role,u.active,s.id AS session_id,s.csrf_token FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>$2 AND u.active=true',[hash,now]);}
 async logout(sessionId:string){await this.db.query('DELETE FROM sessions WHERE id=$1',[sessionId]);}
 async cleanup(now:Date){await this.db.query('DELETE FROM sessions WHERE expires_at<$1',[now]);}
}
