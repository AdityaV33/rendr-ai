import jwt from "jsonwebtoken";

interface JwtPayload {
  sub: string;
}

const accessSecret = process.env.JWT_ACCESS_SECRET!;
const refreshSecret = process.env.JWT_REFRESH_SECRET!;
const accessExpiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN!;
const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN!;

if (
  !accessSecret ||
  !refreshSecret ||
  !accessExpiresIn ||
  !refreshExpiresIn
) {
  throw new Error("Missing JWT environment variables.");
}

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