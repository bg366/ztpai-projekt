import type { Request,Response } from 'express';
import type { Pool } from 'pg';
import type { DomainEvents } from './events.js';
import { AuthService } from './services/auth.js';
import { CatalogService,ownBoat } from './services/catalog.js';
import { ReservationService } from './services/reservations.js';
import { OperationsService } from './services/operations.js';
import { AuthRepository } from './repositories/auth.js';
import { CatalogRepository } from './repositories/catalog.js';
import { ReservationRepository } from './repositories/reservations.js';
import { OperationsRepository } from './repositories/operations.js';
import { requireValue } from './errors.js';
import * as v from './validation.js';
export interface AppOptions {pool:Pool;events:DomainEvents;now?:()=>Date;origin?:string;secureCookie?:boolean;rateLimit?:boolean;trustProxy?:boolean}
export function controllers(options:AppOptions){
 const {pool,events}=options,now=options.now??(()=>new Date());
 const auth=new AuthService(pool,now),catalog=new CatalogService(pool),reservations=new ReservationService(pool,events,now),operations=new OperationsService(pool,events,now);
 const cats=new CatalogRepository(pool),ops=new OperationsRepository(pool);
 const user=(req:Request)=>req.auth!.user,param=(req:Request)=>v.id.parse(req.params.id),page=(req:Request)=>v.pageDto.parse(req.query);
 const scope=(req:Request)=>user(req).role==='SAILOR'?user(req).id:null;
 const cookie={httpOnly:true,sameSite:'lax' as const,secure:options.secureCookie??false,path:'/api',maxAge:7*86400000};
 const signIn=(res:Response,result:Awaited<ReturnType<AuthService['login']>>,status=200)=>{res.cookie('mazurport_session',result.token,cookie).status(status).json({user:result.user,csrfToken:result.csrfToken});};
 return {
  health:async(_req:Request,res:Response)=>{await pool.query('SELECT 1');res.json({status:'ok'});},
  register:async(req:Request,res:Response)=>signIn(res,await auth.register(v.registerDto.parse(req.body)),201),
  login:async(req:Request,res:Response)=>signIn(res,await auth.login(v.loginDto.parse(req.body))),
  logout:async(req:Request,res:Response)=>{await new AuthRepository(pool).logout(req.auth!.sessionId);res.clearCookie('mazurport_session',cookie).status(204).end();},
  me:async(req:Request,res:Response)=>{res.json({user:user(req),csrfToken:req.auth!.csrfToken});},
  boats:async(req:Request,res:Response)=>{res.json(await cats.boats(user(req).id,page(req)));},
  boat:async(req:Request,res:Response)=>{res.json(ownBoat(await cats.boat(param(req)),user(req)));},
  createBoat:async(req:Request,res:Response)=>{res.status(201).json(await cats.createBoat(user(req).id,v.boatDto.parse(req.body)));},
  updateBoat:async(req:Request,res:Response)=>{res.json(await catalog.updateBoat(param(req),v.boatDto.parse(req.body),user(req)));},
  deleteBoat:async(req:Request,res:Response)=>{await catalog.removeBoat(param(req),user(req));res.status(204).end();},
  berths:async(req:Request,res:Response)=>{res.json(await cats.berths(page(req)));},
  berth:async(req:Request,res:Response)=>{res.json(requireValue(await cats.berth(param(req))));},
  createBerth:async(req:Request,res:Response)=>{res.status(201).json(await cats.createBerth(v.berthDto.parse(req.body)));},
  updateBerth:async(req:Request,res:Response)=>{res.json(await catalog.updateBerth(param(req),v.berthDto.parse(req.body)));},
  deleteBerth:async(req:Request,res:Response)=>{await catalog.removeBerth(param(req));res.status(204).end();},
  berthStatus:async(req:Request,res:Response)=>{const b=v.berthStatusDto.parse(req.body);const result=await catalog.berthStatus(param(req),b.status,b.reason);events.publish({type:'berth.status_changed',actorId:user(req).id,payload:{berthId:param(req),...b}});res.json(result);},
  availability:async(req:Request,res:Response)=>{res.json({data:await reservations.available(v.availabilityDto.parse(req.query),user(req))});},
  reservations:async(req:Request,res:Response)=>{res.json(await new ReservationRepository(pool).list(scope(req),page(req)));},
  reservation:async(req:Request,res:Response)=>{res.json(await reservations.get(param(req),user(req)));},
  createReservation:async(req:Request,res:Response)=>{res.status(201).json(await reservations.create(v.reservationDto.parse(req.body),user(req)));},
  cancel:async(req:Request,res:Response)=>{res.json(await reservations.cancel(param(req),user(req)));},
  checkin:async(req:Request,res:Response)=>{res.json(await reservations.checkin(param(req),user(req)));},
  checkout:async(req:Request,res:Response)=>{res.json(await reservations.checkout(param(req),user(req)));},
  faults:async(req:Request,res:Response)=>{res.json(await ops.faults(scope(req),page(req)));},
  createFault:async(req:Request,res:Response)=>{res.status(201).json(await operations.createFault(v.faultDto.parse(req.body),user(req)));},
  updateFault:async(req:Request,res:Response)=>{res.json(await operations.updateFault(param(req),v.resolveFaultDto.parse(req.body),user(req)));},
  users:async(req:Request,res:Response)=>{const p=page(req);res.json(await cats.page('users','(name ILIKE $1 OR email ILIKE $1)',[`%${p.search}%`],p.sort==='name'?'name ASC':`created_at ${p.sort==='oldest'?'ASC':'DESC'}`,p,'id,name,email,role,active,created_at'));},
  updateUser:async(req:Request,res:Response)=>{res.json(await operations.updateUser(param(req),v.userDto.parse(req.body),user(req)));},
  notifications:async(req:Request,res:Response)=>{res.json(await ops.notifications(user(req).id,page(req)));},
  readNotification:async(req:Request,res:Response)=>{res.json(requireValue(await ops.readNotification(param(req),user(req).id,now())));},
  activity:async(req:Request,res:Response)=>{res.json(await ops.activity(page(req)));},
  dashboard:async(req:Request,res:Response)=>{res.json(await ops.dashboard(scope(req)));},
 };
}
