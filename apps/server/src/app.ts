import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";

import healthRouter from "./routes/health.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import projectRouter from "./modules/projects/project.routes.js";
import runtimeRouter from "./modules/runtime/runtime.routes.js";
import { aiRouter } from "./modules/ai/ai.module.js";

import { errorHandler } from "./modules/middleware/error.middleware.js";

export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Always allow the explicitly configured client origin
      if (origin === env.CLIENT_ORIGIN) {
        return callback(null, true);
      }

      // In development, also allow dynamic localhost ports (e.g. Vite starting on 5174 instead of 5173)
      if (env.NODE_ENV === "development") {
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        if (isLocalhost) {
          return callback(null, true);
        }
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/runtime", runtimeRouter);
app.use("/api/v1/ai", aiRouter);

app.use(errorHandler);