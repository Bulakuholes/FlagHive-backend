import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject } from "zod";
import { ZodError } from "zod";

/**
 * Middleware de validation avec Zod
 *
 * @param schema Schéma Zod à utiliser pour la validation
 * @returns Middleware Express
 */
export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Valide les données de la requête avec le schéma Zod
      await schema.parseAsync({
        params: req.params,
        body: req.body,
        query: req.query,
      });

      // Si la validation réussit, passe à la prochaine middleware
      return next();
    } catch (error) {
      // Si la validation échoue, renvoie une réponse d'erreur
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Erreur de validation des données",
          errors: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }

      // Pour les autres types d'erreurs, passe à la prochaine middleware d'erreur
      return next(error);
    }
  };
