import type { Request, Response, NextFunction } from "express";
import logger from "./config";

/**
 * Middleware pour logger les requêtes HTTP
 */
export const httpLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  // Une fois la réponse envoyée
  res.on("finish", () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    // Déterminer le niveau de log en fonction du statut HTTP
    if (res.statusCode >= 500) {
      logger.error(message, {
        ip: req.ip,
        userAgent: req.get("user-agent"),
        body: req.method !== "GET" ? req.body : undefined,
      });
    } else if (res.statusCode >= 400) {
      logger.warn(message, {
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
    } else {
      logger.http(message);
    }
  });

  next();
};

export default httpLogger;
