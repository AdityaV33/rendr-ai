import { userService } from "../users/user.service.js";

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
    throw new Error("Email already registered.");
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
    throw new Error("Invalid email or password.");
  }

  const isPasswordMatches = await compare(
    data.password,
    user.passwordHash
  );

  if (!isPasswordMatches) {
    throw new Error("Invalid email or password.");
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
    throw new Error("Invalid refresh token.");
  }

  const refreshTokenMatches = await compare(
    refreshToken,
    user.refreshTokenHash
  );

  if (!refreshTokenMatches) {
    throw new Error("Invalid refresh token.");
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

export async function logout(userId: string) {
  const user = await userService.findById(userId);

  if (!user) {
    return;
  }

  user.refreshTokenHash = undefined;

  await user.save();
}

export async function me(userId: string) {
  const user = await userService.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}