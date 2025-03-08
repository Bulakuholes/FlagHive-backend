import type { Request, Response } from "express";
import express from "express";

const router = express.Router();

/**
 * @swagger
 * /v1/csrf/token:
 *   get:
 *     summary: Génère un token CSRF
 *     description: Génère un nouveau token CSRF pour protéger les formulaires contre les attaques CSRF
 *     tags: [CSRF]
 *     responses:
 *       200:
 *         description: Token CSRF généré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 *                   example: abcdef123456
 *       500:
 *         description: Erreur lors de la génération du token CSRF
 */
router.get("/token", (req: Request, res: Response) => {
  const csrfToken = req.csrfToken?.();

  if (!csrfToken) {
    return res.status(500).json({
      message: "Erreur lors de la génération du token CSRF",
    });
  }

  return res.json({
    csrfToken,
  });
});

export default router;
