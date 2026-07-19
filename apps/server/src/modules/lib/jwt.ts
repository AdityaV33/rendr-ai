import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

interface JwtPayload {
  sub: string;
}

const accessSecret = env.JWT_ACCESS_SECRET;
const refreshSecret = env.JWT_REFRESH_SECRET;
const accessExpiresIn = env.ACCESS_TOKEN_EXPIRES_IN;
const refreshExpiresIn = env.REFRESH_TOKEN_EXPIRES_IN;

export function generateAccessToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    accessSecret,
    {
      expiresIn: accessExpiresIn as jwt.SignOptions["expiresIn"],
    }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    refreshSecret,
    {
      expiresIn: refreshExpiresIn as jwt.SignOptions["expiresIn"],
    }
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, refreshSecret) as JwtPayload;
}