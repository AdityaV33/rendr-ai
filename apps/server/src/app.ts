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

      // In development, also allow dynamic localhost ports and local network IPs (LAN testing)
      if (env.NODE_ENV === "development") {
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        const isLocalNetwork = /^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);
        if (isLocalhost || isLocalNetwork) {
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