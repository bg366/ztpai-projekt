import { randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { Pool } from 'pg';
import { AuthRepository } from '../repositories/auth.js';
import { AppError,requireValue } from '../errors.js';
import { transaction } from '../db.js';
const scrypt=promisify(scryptCallback);
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return `${salt}:${(await scrypt(password,salt,64) as Buffer).toString('hex')}`;}
export async function verifyPassword(password:string,stored:string){const [salt,hash]=stored.split(':');if(!salt||!hash)return false;const actual=await scrypt(password,salt,64) as Buffer;const expected=Buffer.from(hash,'hex');return expected.length===actual.length&&timingSafeEqual(actual,expected);}
export class AuthService {
 constructor(private pool:Pool,private now:()=>Date){}
 async register(input:{name:string;email:string;password:string}){
  const hash=await hashPassword(input.password);
  return transaction(this.pool,async db=>{const user=requireValue(await new AuthRepository(db).create(input.name,input.email,hash));return this.makeSession(new AuthRepository(db),user);});
 }
 async login(input:{email:string;password:string}){
  const repo=new AuthRepository(this.pool),user=await repo.findEmail(input.email);
  // Stały koszt weryfikacji również dla nieistniejącego konta.
  const valid=await verifyPassword(input.password,user?.password_hash??`${'0'.repeat(32)}:${'0'.repeat(128)}`);
  if(!user||!user.active||!valid)throw new AppError(401,'INVALID_CREDENTIALS','Nieprawidłowy e-mail lub hasło.');
  return this.makeSession(repo,{id:user.id,email:user.email,name:user.name,role:user.role,active:user.active});
 }
 private async makeSession(repo:AuthRepository,user:import('../types.js').User){
  const token=randomBytes(32).toString('hex'),csrfToken=randomBytes(32).toString('hex');
  await repo.cleanup(this.now());
  await repo.session(user.id,tokenHash(token),csrfToken,new Date(this.now().getTime()+7*86400000));
  return {user,token,csrfToken};
 }
}
