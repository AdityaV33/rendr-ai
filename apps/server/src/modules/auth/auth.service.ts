import { userService } from "../users/user.service.js";
import { UnauthorizedError, ConflictError, NotFoundError } from "../lib/http-error.js";

import { compare, hash } from "../lib/bcrypt.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";

import type {
  LoginInput,
  RegisterInput,
} from "./auth.types.js";

export async function register(data: RegisterInput) {
  const existingUser = await userService.findByEmail(data.email);

  if (existingUser) {
    throw new ConflictError("An account with this email already exists.");
  }

  const passwordHash = await hash(data.password);

  const user = await userService.createUser({
    name: data.name,
    email: data.email,
    passwordHash,
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  user.refreshTokenHash = await hash(refreshToken);

  await user.save();

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
}

export async function login(data: LoginInput) {
  const user = await userService.findByEmail(data.email);

  if (!user) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const isPasswordMatches = await compare(
    data.password,
    user.passwordHash
  );

  if (!isPasswordMatches) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  user.refreshTokenHash = await hash(refreshToken);

  await user.save();

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
}

export async function refresh(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  const user = await userService.findById(payload.sub);

  if (!user || !user.refreshTokenHash) {
    throw new UnauthorizedError("Invalid refresh token.");
  }

  const refreshTokenMatches = await compare(
    refreshToken,
    user.refreshTokenHash
  );

  if (!refreshTokenMatches) {
    throw new UnauthorizedError("Invalid refresh token.");
  }

  const newAccessToken = generateAccessToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);

  user.refreshTokenHash = await hash(newRefreshToken);

  await user.save();

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  const user = await userService.findById(payload.sub);

  if (!user) {
    return;
  }

  user.refreshTokenHash = undefined;

  await user.save();
}

export async function me(userId: string) {
  const user = await userService.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}