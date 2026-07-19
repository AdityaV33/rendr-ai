import type{Request,Response} from "express";
import * as authService from "./auth.service.js";
import {refreshTokenCookieOptions} from "../lib/cookies.js";

export async function register(req:Request,res:Response){
  const{user,accessToken,refreshToken} = await authService.register(req.body);
  res.cookie("refreshToken",
    refreshToken,
    refreshTokenCookieOptions,
  );
  return res.status(201).json({
    user,
    accessToken,
  });
}

export async function login(req:Request,res:Response){
  const{user,accessToken,refreshToken} = await authService.login(req.body);
  res.cookie("refreshToken",
    refreshToken,
    refreshTokenCookieOptions,
  );
  return res.status(200).json({
    user,
    accessToken,
  });
}

export async function refresh(req:Request,res:Response){
  const refreshToken = req.cookies.refreshToken;
  if(!refreshToken){
    return res.status(401).json({message:"Refresh token missing."});
  }
  const {
    user,
    accessToken,
    refreshToken:newRefreshToken,
  } = await authService.refresh(refreshToken);

  res.cookie("refreshToken",
    newRefreshToken,
    refreshTokenCookieOptions,
  );
  return res.status(200).json({
    user,
    accessToken,
  });
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  res.clearCookie(
    "refreshToken",
    refreshTokenCookieOptions,
  );

  return res.status(200).json({
    message: "Logged out successfully.",
  });
}

export async function me(req: Request, res: Response) {
  const user = await authService.me(req.user.id);

  return res.status(200).json(user);
}
  