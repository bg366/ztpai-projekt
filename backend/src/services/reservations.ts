import type { Pool } from 'pg';
import {transaction} from '../db.js';
import { AppError,requireValue } from '../errors.js';
import { fits,price,checkoutPrice,validatePeriod,requireTransition } from '../domain.js';
import { ReservationRepository } from '../repositories/reservations.js';
import { CatalogRepository } from '../repositories/catalog.js';
import { ownBoat } from './catalog.js';
import type { User } from '../types.js';
import type { DomainEvents } from '../events.js';
export class ReservationService {
 constructor(private pool:Pool,private events:DomainEvents,private now:()=>Date){}
 get(id:string,user:User){return this.visible(id,user);}
 private async visible(id:string,user:User){const result=requireValue(await new ReservationRepository(this.pool).get(id));if(user.role==='SAILOR'&&result.user_id!==user.id)throw new AppError(404,'NOT_FOUND','Nie znaleziono rezerwacji.');return result;}
 async available(input:{boat_id:string;starts_at:string;ends_at:string},user:User){
  const boat=ownBoat(await new CatalogRepository(this.pool).boat(input.boat_id),user),start=new Date(input.starts_at),end=new Date(input.ends_at);validatePeriod(start,end,this.now());
  return (await new ReservationRepository(this.pool).available(boat,start,end)).map(berth=>({...berth,quoted_cents:price(start,end,berth.rate_cents)}));
 }
 async create(input:{boat_id:string;berth_id:string;starts_at:string;ends_at:string},user:User){
  const start=new Date(input.starts_at),end=new Date(input.ends_at);validatePeriod(start,end,this.now());
  const result=await transaction(this.pool,async db=>{
   const catalog=new CatalogRepository(db);const boat=ownBoat(await catalog.boat(input.boat_id,true),user),berth=requireValue(await catalog.berth(input.berth_id,true));
   if(berth.status!=='AVAILABLE')throw new AppError(409,'BERTH_CLOSED','To miejsce jest zamknięte.');
   if(!fits(boat as any,berth as any))throw new AppError(422,'BOAT_TOO_LARGE','Wymiary jachtu przekraczają parametry miejsca.');
   return requireValue(await new ReservationRepository(db).create({userId:user.id,boatId:input.boat_id,berthId:input.berth_id,start,end,rate:berth.rate_cents,quoted:price(start,end,berth.rate_cents)}));
  });
  this.events.publish({type:'reservation.created',actorId:user.id,userId:user.id,message:'Rezerwacja została potwierdzona.',payload:{reservationId:result.id}});return this.get(result.id,user);
 }
 async cancel(id:string,user:User){
  await this.visible(id,user);
  const result=await transaction(this.pool,async db=>{const repo=new ReservationRepository(db),r=requireValue(await repo.get(id,true));requireTransition(r.status,'CONFIRMED');if(user.role==='SAILOR'&&new Date(r.starts_at)<=this.now())throw new AppError(409,'CANCELLATION_CLOSED','Termin rezerwacji już się rozpoczął. Skontaktuj się z obsługą.');await repo.cancel(id);return r;});
  this.events.publish({type:'reservation.cancelled',actorId:user.id,userId:result.user_id,message:'Rezerwacja została anulowana.',payload:{reservationId:id}});return this.get(id,user);
 }
 async checkin(id:string,user:User){
  const r=await transaction(this.pool,async db=>{const repo=new ReservationRepository(db),r=requireValue(await repo.get(id,true));requireTransition(r.status,'CONFIRMED');const now=this.now();if(now<new Date(r.starts_at)||now>=new Date(r.ends_at))throw new AppError(409,'OUTSIDE_PERIOD','Zameldowanie jest możliwe tylko w terminie rezerwacji.');
   const berth=requireValue(await new CatalogRepository(db).berth(r.berth_id,true));if(berth.status==='CLOSED')throw new AppError(409,'BERTH_CLOSED','Miejsce jest zamknięte. Najpierw usuń usterkę i otwórz miejsce.');
   if(await repo.occupied(r.berth_id,id))throw new AppError(409,'STILL_OCCUPIED','Poprzedni jacht nie został jeszcze wymeldowany.');await repo.checkin(id,now);return r;});
  this.events.publish({type:'reservation.checked_in',actorId:user.id,userId:r.user_id,message:'Zameldowano jacht. Miłego pobytu!',payload:{reservationId:id}});return this.get(id,user);
 }
 async checkout(id:string,user:User){
  const r=await transaction(this.pool,async db=>{const repo=new ReservationRepository(db),r=requireValue(await repo.get(id,true));requireTransition(r.status,'CHECKED_IN');await repo.checkout(id,this.now(),checkoutPrice(new Date(r.starts_at),new Date(r.ends_at),this.now(),r.rate_cents));return r;});
  this.events.publish({type:'reservation.checked_out',actorId:user.id,userId:r.user_id,message:'Zakończono pobyt. Rozliczenie znajdziesz w rezerwacji.',payload:{reservationId:id}});return this.get(id,user);
 }
}
