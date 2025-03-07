import type { Express } from "express";
import { Router } from "express";
import authRoutes from "./auth";
import challengesRoutes from "./challenges";
import csrfRoutes from "./csrf";
import teamsRoutes from "./teams";

/**
 * Enregistre toutes les routes API
 * @param app Instance Express
 */
export const register = (app: Express): void => {
  const router = Router();

  // Monter les sous-routes
  router.use("/auth", authRoutes);
  router.use("/csrf", csrfRoutes);
  router.use("/teams", teamsRoutes);
  router.use("/challenges", challengesRoutes);

  // Route racine de l'API
  router.get("/", (req, res) => {
    res.json({ message: "API FlagHive opérationnelle" });
  });

  // Monter toutes les routes API sous /api
  app.use("/api", router);
};
