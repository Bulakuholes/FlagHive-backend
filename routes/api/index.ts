import type { Express } from "express";
import { Router } from "express";
import v1Routes from "./v1";

/**
 * @swagger
 * /:
 *   get:
 *     summary: Point d'entrée principal de l'API
 *     description: Retourne les informations de base sur l'API et les versions disponibles
 *     tags: [API]
 *     responses:
 *       200:
 *         description: Informations sur l'API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: API FlagHive opérationnelle
 *                 versions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["v1"]
 */

/**
 * Enregistre toutes les routes API
 * @param app Instance Express
 */
export const register = (app: Express): void => {
  const router = Router();

  // Route racine de l'API
  router.get("/", (req, res) => {
    res.json({
      message: "API FlagHive opérationnelle",
      versions: ["v1"],
    });
  });

  // Monter toutes les routes API sous /api
  app.use("/api", router);

  // Enregistrer les routes versionnées
  v1Routes.register(app);
};
