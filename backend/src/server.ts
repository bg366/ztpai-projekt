import { createApp } from './app.js';
import { config } from './config.js';
import { createPool } from './db.js';
import { attachListeners,DomainEvents } from './events.js';
const pool=createPool(config.DATABASE_URL),events=new DomainEvents();attachListeners(events,pool);
const server=createApp({pool,events,origin:config.APP_ORIGIN,secureCookie:config.secureCookie,trustProxy:config.NODE_ENV==='production'}).listen(config.PORT,()=>console.log(`MazurPort API, port ${config.PORT}`));
async function shutdown(){server.close(async()=>{await events.drain();await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
