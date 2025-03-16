import type { Express } from "express";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger/swagger";

/**
 * Enregistre les routes pour la documentation Swagger
 * @param app Instance Express
 */
export const register = (app: Express): void => {
  const router = Router();

  // Route pour accéder à la documentation Swagger
  router.use("/", swaggerUi.serve);
  router.get(
    "/",
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Documentation API FlagHive",
    })
  );

  // Route pour obtenir la spécification Swagger au format JSON
  router.get("/json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Monter les routes Swagger sous /docs
  app.use("/docs", router);
};

export default { register };
