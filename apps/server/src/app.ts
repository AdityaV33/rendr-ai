import express from 'express';
import healthRouter from './routes/health.routes.js';
import authRouter from "./modules/auth/auth.routes.js";
import cors from 'cors';
import { env } from './config/env.js';
import cookieParser from "cookie-parser";
import{errorHandler} from "./modules/middleware/error.middleware.js";
import projectRouter from "./modules/projects/project.routes.js";

export const app = express();
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);


app.use(express.json());
app.use(cookieParser());
app.use('/api/v1', healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use(errorHandler);

