import type { User } from "@prisma/client";
import * as jose from "jose";
import config from "../config/config";
import {
  findUserByUsername,
  updateLastLogin,
  verifyPassword,
} from "./userService";

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
    console.error("Erreur de vérification JWT:", error);
    throw error;
  }
};

/**
 * Authentifie un utilisateur et génère un token JWT
 */
export const authenticateUser = async (
  username: string,
  password: string
): Promise<{ user: User; token: string } | null> => {
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

  return { user, token };
};
