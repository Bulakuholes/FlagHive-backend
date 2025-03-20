import { doubleCsrf } from "csrf-csrf";
import type { Request, Response, NextFunction } from "express";
import config from "../config/config";

// Configuration CSRF
const csrfUtils = doubleCsrf({
  getSecret: () => config.csrfSecret,
  cookieName: config.csrf.cookieName,
  cookieOptions: config.csrf.cookieOptions,
  size: config.csrf.size,
  ignoredMethods: config.csrf.ignoredMethods,
});

/**
 * Middleware pour générer automatiquement un token CSRF pour chaque requête
 * et ajouter la méthode csrfToken à l'objet Request
 */
export const csrfTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.csrfToken = () => csrfUtils.generateToken(req, res);

  if (req.method === "GET") {
    csrfUtils.generateToken(req, res);
  }

  next();
};

/**
 * Middleware pour la protection CSRF
 * À appliquer sur toutes les routes non-GET qui modifient des données
 */
export const csrfProtectionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    csrfUtils.validateRequest(req);
    next();
  } catch (error) {
    res.status(403).json({
      message: "Validation CSRF échouée",
      error: (error as Error).message,
    });
  }
};

/**
 * Route pour récupérer un nouveau token CSRF
 */
export const getCsrfToken = (req: Request, res: Response) => {
  const token = csrfUtils.generateToken(req, res);
  return res.json({ csrfToken: token });
};

// Export des fonctions utilitaires
export const { generateToken, validateRequest, doubleCsrfProtection } =
  csrfUtils;
