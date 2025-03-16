import type { Express } from "express";
import { Router } from "express";
import authRoutes from "./auth";
import csrfRoutes from "./csrf";
import eventsRoutes from "./events";
import teamsRoutes from "./teams";

/**
 * @swagger
 * /v1:
 *   get:
 *     summary: Point d'entrée de l'API v1
 *     description: Retourne les informations de base sur l'API v1
 *     tags: [API]
 *     responses:
 *       200:
 *         description: Informations sur l'API v1
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: API FlagHive v1 opérationnelle
 */

/**
 * Enregistre toutes les routes API v1
 * @param app Instance Express
 */
export const register = (app: Express): void => {
  const router = Router();

  // Route racine de l'API v1
  router.get("/", (req, res) => {
    res.json({ message: "API FlagHive v1 opérationnelle" });
  });

  // Monter les sous-routes
  router.use("/auth", authRoutes);
  router.use("/teams", teamsRoutes);
  router.use("/events", eventsRoutes);
  router.use("/csrf", csrfRoutes);

  // Monter toutes les routes API v1 sous /api/v1
  app.use("/api/v1", router);
};

export default { register };
