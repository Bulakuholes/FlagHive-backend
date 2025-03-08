import type { Request, Response } from "express";
import express from "express";
import { sendError, sendSuccess } from "../../../../utils/responseHandler";

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
    return sendError(
      res,
      "Erreur lors de la génération du token CSRF",
      500,
      "CSRF_TOKEN_ERROR"
    );
  }

  return sendSuccess(res, "Token CSRF généré avec succès", {
    csrfToken,
  });
});

export default router;
