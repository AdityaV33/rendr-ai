import type {
  NextFunction,
  Request,
  Response,
  RequestHandler,
} from "express";

export function asyncHandler(
  handler: RequestHandler,
): RequestHandler {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    Promise.resolve(
      handler(req, res, next),
    ).catch(next);
  };
}