import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { HttpError } from "../lib/http-error.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err);

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  return res.status(500).json({
    message: err.message || "Internal server error.",
  });
}