import {CookieOptions} from "express";
const isProduction = process.env.NODE_ENV === "production";

export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite:"strict",
  path:"/api/v1/auth/refresh",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };