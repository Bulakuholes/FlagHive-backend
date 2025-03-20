import type { User } from "@prisma/client";
import * as jose from "jose";
import { logError } from "../utils/logger";
import config from "../config/config";
import {
  findUserByUsername,
  updateLastLogin,
  verifyPassword,
} from "./userService";
import type { Response } from "express";

/**
 * Type pour les données utilisateur dans le token JWT
 */
export type JwtPayload = {
  userId: string;
  username: string;
  email: string;
  role: string;
};

/**
 * Configuration du cookie JWT
 */
export const jwtCookieConfig = {
  name: "auth_token",
  options: {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "strict" as const,
    maxAge: 3600000, // 1 heure en millisecondes
    path: "/",
  },
};

/**
 * Génère un JWT
 */
export const generateJWT = async (
  payload: JwtPayload,
  secret: string = config.jwtSecret,
  expiresIn: string = config.jwtExpiresIn
): Promise<string> => {
  const secretKey = new TextEncoder().encode(secret);
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
};

/**
 * Vérifie un JWT
 */
export const verifyJWT = async (
  token: string,
  secret: string = config.jwtSecret
): Promise<JwtPayload> => {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);
    return payload as JwtPayload;
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      "Erreur de vérification JWT"
    );
    throw error;
  }
};

/**
 * Définit le token JWT dans un cookie
 */
export const setJWTCookie = (res: Response, token: string): void => {
  res.cookie(jwtCookieConfig.name, token, jwtCookieConfig.options);
};

/**
 * Supprime le cookie JWT
 */
export const clearJWTCookie = (res: Response): void => {
  res.clearCookie(jwtCookieConfig.name, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "strict",
    path: "/",
  });
};

/**
 * Authentifie un utilisateur et génère un token JWT
 */
export const authenticateUser = async (
  username: string,
  password: string,
  res: Response
): Promise<{ user: User } | null> => {
  const user = await findUserByUsername(username);

  if (!user || !verifyPassword(password, user.hashedPassword)) {
    return null;
  }

  // Met à jour la date de dernière connexion
  await updateLastLogin(user.id);

  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  const token = await generateJWT(payload);

  setJWTCookie(res, token);

  return { user };
};
