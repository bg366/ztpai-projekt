import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { controllers,type AppOptions } from './controllers.js';
import { authenticate,roles } from './middleware.js';
export function routes(options:AppOptions){
 const router=Router(),c=controllers(options),staff=roles('STAFF','ADMIN'),admin=roles('ADMIN');
 router.get('/health',c.health);
 const limiter=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-7',legacyHeaders:false,message:{error:{code:'RATE_LIMIT',message:'Zbyt wiele prób. Spróbuj za 15 minut.'}},skip:()=>options.rateLimit===false});
 router.post('/auth/register',limiter,c.register);router.post('/auth/login',limiter,c.login);
 router.use(authenticate(options.pool,options.now??(()=>new Date())));
 router.get('/auth/me',c.me);router.post('/auth/logout',c.logout);
 router.get('/dashboard',c.dashboard);
 router.get('/boats',c.boats);router.post('/boats',c.createBoat);router.get('/boats/:id',c.boat);router.put('/boats/:id',c.updateBoat);router.delete('/boats/:id',c.deleteBoat);
 router.get('/berths',c.berths);router.post('/berths',admin,c.createBerth);router.get('/berths/:id',c.berth);router.put('/berths/:id',admin,c.updateBerth);router.delete('/berths/:id',admin,c.deleteBerth);router.patch('/berths/:id/status',staff,c.berthStatus);
 router.get('/availability',c.availability);
 router.get('/reservations',c.reservations);router.post('/reservations',c.createReservation);router.get('/reservations/:id',c.reservation);router.post('/reservations/:id/cancel',c.cancel);router.post('/reservations/:id/check-in',staff,c.checkin);router.post('/reservations/:id/check-out',staff,c.checkout);
 router.get('/faults',c.faults);router.post('/faults',c.createFault);router.patch('/faults/:id',staff,c.updateFault);
 router.get('/users',admin,c.users);router.patch('/users/:id',admin,c.updateUser);
 router.get('/notifications',c.notifications);router.patch('/notifications/:id/read',c.readNotification);
 router.get('/activity',staff,c.activity);
 return router;
}
