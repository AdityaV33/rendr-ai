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

  GEMINI_TIMEOUT_MS: z.coerce.number().positive().default(120000), // 2 minutes

  GEMINI_GENERATOR_TIMEOUT_MS: z.coerce.number().default(60000),

  GEMINI_REPAIR_TIMEOUT_MS: z.coerce.number().default(30000),

  // Groq settings
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODELS: z
    .string()
    .default("qwen/qwen3.6-27b,openai/gpt-oss-20b,openai/gpt-oss-120b")
    .transform((val) => val.split(",").map((s) => s.trim()).filter(Boolean))
    .refine((arr) => arr.length > 0, {
      message: "GROQ_MODELS must contain at least one valid model.",
    }),

  MODEL_COOLDOWN_MS: z.coerce.number().positive().default(30000),

  GEMINI_MAX_RETRIES: z.coerce.number().min(0).default(3),

  GEMINI_MAX_PARALLEL_REPAIRS: z.coerce.number().min(1).default(3),

  STORAGE_ROOT: z.string().default("./.workspace"),

  GENERATOR_VERSION: z.enum(["v1", "v2"]).default("v1"),

  MAX_PARALLEL_GENERATIONS: z.coerce.number().min(1).default(4),

  GENERATOR_BATCH_MAX_FILES: z.coerce.number().min(1).default(4),
  GENERATOR_BATCH_MAX_OUTPUT_TOKENS: z.coerce.number().min(100).default(4000),
  GENERATOR_BATCH_CONCURRENCY: z.coerce.number().min(1).default(2),
});

export const env = envSchema.parse(process.env);