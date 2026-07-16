import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  MONGODB_URI: z.string().min(1),
  CLIENT_ORIGIN: z.string().url(),
  
});

export const env = envSchema.parse(process.env);