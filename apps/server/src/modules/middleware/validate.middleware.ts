import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

export function validate<T>(schema: z.ZodType<T>) {
  return (
    req: Request,
    _res: Response,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? "Invalid request.");
    }

    req.body = result.data;
    next();
  };
}