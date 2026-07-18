import express from 'express';
import healthRouter from './routes/health.routes.js';
import cors from 'cors';
import { env } from './config/env.js';
import cookieParser from "cookie-parser";

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

