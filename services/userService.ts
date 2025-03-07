import type { User } from "@prisma/client";
import { UserRole } from "@prisma/client";
import * as crypto from "crypto";
import { prisma } from "../prisma/client";

/**
 * Crée un hash du mot de passe
 */
export const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
};

/**
 * Vérifie si un mot de passe correspond au hash stocké
 */
export const verifyPassword = (
  password: string,
  hashedPassword: string
): boolean => {
  const [salt, storedHash] = hashedPassword.split(":");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return storedHash === hash;
};

/**
 * Crée un nouvel utilisateur
 */
export const createUser = async (
  username: string,
  email: string,
  password: string,
  role: UserRole = "USER"
): Promise<User> => {
  const hashedPassword = hashPassword(password);

  return prisma.user.create({
    data: {
      username,
      email,
      hashedPassword,
      role,
      active: true,
    },
  });
};

/**
 * Trouve un utilisateur par son nom d'utilisateur
 */
export const findUserByUsername = async (
  username: string
): Promise<User | null> => {
  return prisma.user.findUnique({
    where: {
      username,
    },
  });
};

/**
 * Trouve un utilisateur par son email
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
};

/**
 * Trouve un utilisateur par son ID
 */
export const findUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: {
      id,
    },
  });
};

/**
 * Met à jour la date de dernière connexion
 */
export const updateLastLogin = async (id: string): Promise<User> => {
  return prisma.user.update({
    where: {
      id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });
};
