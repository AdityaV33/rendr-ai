import type { Request, Response } from "express";
import { aiService } from "./ai.service.js";

export const generate = async (req: Request, res: Response) => {
  try {
    const result = await aiService.generate(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(501).json({ error: "Not implemented" });
  }
};

export const refine = async (req: Request, res: Response) => {
  try {
    const result = await aiService.refine(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(501).json({ error: "Not implemented" });
  }
};
