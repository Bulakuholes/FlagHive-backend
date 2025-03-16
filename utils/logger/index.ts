import logger from "./config";

// Exportation des fonctions de logging pour faciliter leur utilisation
export const error = (message: string, meta?: any): void => {
  logger.error(message, meta);
};

export const warn = (message: string, meta?: any): void => {
  logger.warn(message, meta);
};

export const info = (message: string, meta?: any): void => {
  logger.info(message, meta);
};

export const http = (message: string, meta?: any): void => {
  logger.http(message, meta);
};

export const debug = (message: string, meta?: any): void => {
  logger.debug(message, meta);
};

// Fonction pour logger les erreurs avec stack trace
export const logError = (error: Error, context?: string): void => {
  const message = context ? `[${context}] ${error.message}` : error.message;
  logger.error(message, { stack: error.stack });
};

// Exportation du logger complet pour les cas d'utilisation avancés
export default logger;
