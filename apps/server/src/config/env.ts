import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  MONGODB_URI: z.string().min(1),

  CLIENT_ORIGIN: z.string().url(),

  ENABLE_DNS_WORKAROUND: z.coerce.boolean().default(false),

  JWT_ACCESS_SECRET: z.string().min(1),

  JWT_REFRESH_SECRET: z.string().min(1),

  ACCESS_TOKEN_EXPIRES_IN: z.string().min(1),

  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1),

  GEMINI_API_KEY: z.string().min(1),

  GEMINI_MODEL: z.string().default("models/gemini-flash-latest"),

  GEMINI_TEMPERATURE: z.coerce.number().default(0.7),

  GEMINI_MAX_OUTPUT_TOKENS: z.coerce.number().default(8192),

  GEMINI_TIMEOUT_MS: z.coerce.number().default(60000),
});

export const env = envSchema.parse(process.env);