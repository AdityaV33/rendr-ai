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

  GEMINI_MODELS: z
    .string()
    .default("models/gemini-3.6-flash,models/gemini-flash-latest,models/gemini-3.5-flash,models/gemini-3.1-flash-lite,models/gemini-3.5-flash-lite,models/gemini-flash-lite-latest")
    .transform((val) => val.split(",").map((s) => s.trim()).filter(Boolean))
    .refine((arr) => arr.length > 0, {
      message: "GEMINI_MODELS must contain at least one valid model.",
    }),

  GEMINI_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.7),

  GEMINI_MAX_OUTPUT_TOKENS: z.coerce.number().positive().default(8192),

  GEMINI_TIMEOUT_MS: z.coerce.number().positive().default(60000),

  MODEL_COOLDOWN_MS: z.coerce.number().positive().default(30000),
});

export const env = envSchema.parse(process.env);