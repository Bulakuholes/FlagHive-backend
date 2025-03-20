import type { NextFunction, Request, Response } from "express";
import { jwtCookieConfig, verifyJWT } from "../services/authService";

// Étend l'interface Request pour inclure l'utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware pour vérifier le JWT et ajouter l'utilisateur à la requête
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies[jwtCookieConfig.name];

  // Si j'ai pas de token dans le cookie, vérifier l'en-tête Authorization
  const authHeader = req.headers.authorization;
  let authToken: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    authToken = authHeader.split(" ")[1];
  }

  // cookie ou header
  const jwtToken = token || authToken;

  if (!jwtToken) {
    return res.status(401).json({ message: "Authentification requise" });
  }

  try {
    const payload = await verifyJWT(jwtToken);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

/**
 * Middleware pour vérifier le rôle de l'utilisateur
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    next();
  };
};
