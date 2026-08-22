import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

import { BadRequestError } from "../lib/http-error.js";

export function validate<T>(schema: z.ZodType<T>) {
  return (
    req: Request,
    _res: Response,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw new BadRequestError(result.error.issues[0]?.message ?? "Invalid request.");
    }

    req.body = result.data;
    next();
  };
}