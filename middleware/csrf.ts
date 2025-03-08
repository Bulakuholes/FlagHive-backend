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

// Middleware pour ajouter la méthode csrfToken à l'objet Request
export const csrfTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.csrfToken = () => csrfUtils.generateToken(req, res);
  next();
};

// Middleware pour la protection CSRF
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

// Exporter les fonctions utilitaires
export const { generateToken, validateRequest, doubleCsrfProtection } =
  csrfUtils;
