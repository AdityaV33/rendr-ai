import express from 'express';
import healthRouter from './routes/health.routes.js';


export const app = express();
app.use('/api/v1', healthRouter);

app.use(express.json());