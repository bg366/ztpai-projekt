import { z } from 'zod';
const env = z.object({
  DATABASE_URL: z.string().url(), PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.string().url().default('http://localhost:8082'),
  COOKIE_SECURE: z.enum(['true','false']).default('false'), NODE_ENV: z.string().default('development'),
}).parse(process.env);
export const config = {...env, secureCookie:env.COOKIE_SECURE === 'true'};
