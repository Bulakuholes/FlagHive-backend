import type { Request, Response } from "express";
import express from "express";
import {
  getCsrfToken,
  csrfProtectionMiddleware,
} from "../../../../middleware/csrf";
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
router.get("/token", getCsrfToken);

/**
 * @swagger
 * /v1/csrf/test:
 *   post:
 *     summary: Tester la protection CSRF
 *     description: Route de test pour vérifier que la protection CSRF fonctionne
 *     tags: [CSRF]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Test CSRF réussi
 *       403:
 *         description: Validation CSRF échouée
 */
router.post(
  "/test",
  csrfProtectionMiddleware,
  (req: Request, res: Response) => {
    return sendSuccess(res, "Test CSRF réussi", {
      message: "La protection CSRF fonctionne correctement",
    });
  }
);

export default router;
