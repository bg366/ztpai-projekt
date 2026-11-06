import type { Pool } from 'pg';
import { transaction } from '../db.js';
import { AppError,requireValue } from '../errors.js';
import { CatalogRepository } from '../repositories/catalog.js';
import { OperationsRepository } from '../repositories/operations.js';
import type { User } from '../types.js';
import type { DomainEvents } from '../events.js';
export class OperationsService {
 constructor(private pool:Pool,private events:DomainEvents,private now:()=>Date){}
 async createFault(input:{berth_id:string;description:string;severity:string},user:User){
  const result=await transaction(this.pool,async db=>{const catalog=new CatalogRepository(db);requireValue(await catalog.berth(input.berth_id,true));const result=requireValue(await new OperationsRepository(db).createFault(input.berth_id,user.id,input.description,input.severity));
   if(input.severity==='CRITICAL')await catalog.status(input.berth_id,'CLOSED','Zgłoszona usterka krytyczna. Wymagana kontrola obsługi.');return result;});
  this.events.publish({type:'fault.reported',actorId:user.id,userId:user.id,message:input.severity==='CRITICAL'?'Przyjęto zgłoszenie. Miejsce tymczasowo zamknięto.':'Przyjęto zgłoszenie usterki.',payload:{faultId:result.id,severity:input.severity}});return result;
 }
 async updateFault(id:string,input:{status:string;resolution:string},user:User){
  const result=await transaction(this.pool,async db=>{const repo=new OperationsRepository(db),old=requireValue(await repo.fault(id,true));if(old.status==='RESOLVED')throw new AppError(409,'FAULT_RESOLVED','Usterka jest już rozwiązana. W razie nowej awarii utwórz nowe zgłoszenie.');return requireValue(await repo.updateFault(id,input.status,input.resolution,user.id,this.now()));});
  this.events.publish({type:'fault.updated',actorId:user.id,userId:result.reporter_id,message:input.status==='RESOLVED'?'Zgłoszona usterka została usunięta.':'Obsługa rozpoczęła naprawę usterki.',payload:{faultId:id,status:input.status}});return result;
 }
 async updateUser(id:string,input:{role:string;active:boolean},user:User){
  if(id===user.id)throw new AppError(409,'SELF_UPDATE','Nie można zmieniać własnych uprawnień w tym panelu.');
  const result=await transaction(this.pool,async db=>{const repo=new OperationsRepository(db);await repo.lockAdmins();const target=requireValue(await repo.user(id));if(target.role==='ADMIN'&&target.active&&(input.role!=='ADMIN'||!input.active)&&(await repo.admins()).length<=1)throw new AppError(409,'LAST_ADMIN','Nie można usunąć ostatniego aktywnego administratora.');return repo.updateUser(id,input.role,input.active);});
  this.events.publish({type:'user.updated',actorId:user.id,payload:{userId:id,...input}});return result;
 }
}
