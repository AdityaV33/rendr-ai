import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { verifyAccessToken } from "../lib/jwt.js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const accessToken = authorization.split(" ")[1];

  const payload = verifyAccessToken(accessToken);

  req.user = {
    id: payload.sub,
  };

  next();
}