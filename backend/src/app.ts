import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { routes } from './routes.js';
import { errors } from './middleware.js';
import { AppError } from './errors.js';
import type { AppOptions } from './controllers.js';
export function createApp(options:AppOptions){
 const app=express();app.disable('x-powered-by');if(options.trustProxy)app.set('trust proxy',1);
 app.use(helmet());app.use(express.json({limit:'32kb'}));app.use(cookieParser());
 app.use((req,_res,next)=>{const origin=req.get('origin');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&origin&&origin!==options.origin)throw new AppError(403,'ORIGIN','Niedozwolone źródło żądania.');next();});
 app.use('/api',routes(options));
 app.use((_req,_res)=>{throw new AppError(404,'NOT_FOUND','Nie znaleziono endpointu.');});app.use(errors);return app;
}
