import type { Response } from "express";

/**
 * Interface pour les réponses API standardisées
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code?: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * Envoie une réponse de succès standardisée
 * @param res Objet Response d'Express
 * @param message Message de succès
 * @param data Données à renvoyer
 * @param statusCode Code de statut HTTP (défaut: 200)
 * @param meta Métadonnées additionnelles (pagination, etc.)
 */
export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
  meta?: Omit<ApiResponse["meta"], "timestamp">
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return res.status(statusCode).json(response);
};

/**
 * Envoie une réponse d'erreur standardisée
 * @param res Objet Response d'Express
 * @param message Message d'erreur
 * @param statusCode Code de statut HTTP (défaut: 400)
 * @param errorCode Code d'erreur spécifique (optionnel)
 * @param details Détails supplémentaires sur l'erreur (optionnel)
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errorCode?: string,
  details?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error: {
      code: errorCode,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(statusCode).json(response);
};

/**
 * Envoie une réponse paginée standardisée
 * @param res Objet Response d'Express
 * @param message Message de succès
 * @param data Données à renvoyer
 * @param page Numéro de page actuel
 * @param limit Nombre d'éléments par page
 * @param total Nombre total d'éléments
 * @param statusCode Code de statut HTTP (défaut: 200)
 */
export const sendPaginatedSuccess = <T>(
  res: Response,
  message: string,
  data: T,
  page: number,
  limit: number,
  total: number,
  statusCode = 200
): Response => {
  const totalPages = Math.ceil(total / limit);

  return sendSuccess(res, message, data, statusCode, {
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
};
