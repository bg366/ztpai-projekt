import type { Pool } from 'pg';
import { transaction } from '../db.js';
import { AppError,requireValue } from '../errors.js';
import { CatalogRepository } from '../repositories/catalog.js';
import type { User } from '../types.js';
export function ownBoat(boat:Record<string,any>|undefined,user:User){const found=requireValue(boat);if(found.owner_id!==user.id)throw new AppError(404,'NOT_FOUND','Nie znaleziono jachtu.');return found;}
export class CatalogService {
 constructor(private pool:Pool){}
 async updateBoat(id:string,input:Record<string,unknown>,user:User){return transaction(this.pool,async db=>{
  const repo=new CatalogRepository(db);const boat=ownBoat(await repo.boat(id,true),user);
  if(['length_cm','width_cm','draft_cm'].some(key=>boat[key]!==input[key])&&await repo.hasActiveBoatReservations(id))throw new AppError(409,'ACTIVE_RESERVATION','Nie można zmienić wymiarów jachtu z aktywną rezerwacją.');
  return repo.updateBoat(id,input);
 });}
 async removeBoat(id:string,user:User){await transaction(this.pool,async db=>{const repo=new CatalogRepository(db);ownBoat(await repo.boat(id,true),user);if(await repo.hasActiveBoatReservations(id))throw new AppError(409,'ACTIVE_RESERVATION','Najpierw zakończ lub anuluj rezerwacje jachtu.');await repo.archiveBoat(id);});}
 async updateBerth(id:string,input:Record<string,unknown>){return transaction(this.pool,async db=>{
  const repo=new CatalogRepository(db),berth=requireValue(await repo.berth(id,true));
  if(['max_length_cm','max_width_cm','max_draft_cm'].some(key=>berth[key]!==input[key])&&await repo.hasActiveBerthReservations(id))throw new AppError(409,'ACTIVE_RESERVATION','Nie można zmienić wymiarów miejsca z aktywną rezerwacją.');
  return repo.updateBerth(id,input);
 });}
 async removeBerth(id:string){await transaction(this.pool,async db=>{const repo=new CatalogRepository(db);requireValue(await repo.berth(id,true));if(await repo.hasActiveBerthReservations(id))throw new AppError(409,'ACTIVE_RESERVATION','Miejsce ma aktywne rezerwacje.');if(await repo.openCritical(id))throw new AppError(409,'OPEN_FAULT','Najpierw zamknij usterkę krytyczną.');await repo.archiveBerth(id);});}
 async berthStatus(id:string,status:string,reason:string){return transaction(this.pool,async db=>{const repo=new CatalogRepository(db);requireValue(await repo.berth(id,true));if(status==='AVAILABLE'&&await repo.openCritical(id))throw new AppError(409,'OPEN_FAULT','Najpierw rozwiąż wszystkie usterki krytyczne tego miejsca.');return repo.status(id,status,status==='CLOSED'?reason:'');});}
}
