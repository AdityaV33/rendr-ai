import type { Request, Response } from "express";
import { aiService } from "./ai.service.js";

export const generate = async (req: Request, res: Response) => {
  const result = await aiService.generate(req.body);
  res.status(200).json(result);
};

export const refine = async (req: Request, res: Response) => {
  const result = await aiService.refine(req.body);
  res.status(200).json(result);
};
