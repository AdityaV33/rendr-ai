import type {
  NextFunction,
  Request,
  Response,
} from "express";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err);

  return res.status(500).json({
    message: err.message || "Internal server error.",
  });
}