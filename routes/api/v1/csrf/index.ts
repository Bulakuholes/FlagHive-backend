import type { Request, Response } from "express";
import express from "express";
import { sendError, sendSuccess } from "../../../../utils/responseHandler";

const router = express.Router();

/**
 * @swagger
 * /v1/csrf/token:
 *   get:
 *     summary: Récupérer un token CSRF
 *     description: Récupère un token CSRF pour sécuriser les formulaires
 *     tags: [CSRF]
 *     responses:
 *       200:
 *         description: Token CSRF récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         csrfToken:
 *                           type: string
 *                           description: Token CSRF à inclure dans les requêtes
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
