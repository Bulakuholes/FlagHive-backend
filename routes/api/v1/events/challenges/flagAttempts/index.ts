import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT } from "../../../../../../middlewares/authMiddleware";
import { validate } from "../../../../../../middlewares/validationMiddleware";
import {
  addCommentToFlagAttempt,
  getFlagAttemptById,
  getFlagAttemptsByChallenge,
} from "../../../../../../services/flagAttempts/flagAttemptService";
import { sendError, sendSuccess } from "../../../../../../utils/responseHandler";
import { addCommentSchema } from "../../../../../../validation/flagAttemptValidation";

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/flagAttempts:
 *   get:
 *     summary: Récupérer les tentatives de flag pour un challenge
 *     description: Récupère toutes les tentatives de flag pour un challenge spécifique
 *     tags: [FlagAttempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'événement
 *       - in: path
 *         name: challengeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du challenge
 *     responses:
 *       200:
 *         description: Liste des tentatives de flag
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Tentatives de flag récupérées avec succès
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       flagValue:
 *                         type: string
 *                       isSuccess:
 *                         type: boolean
 *                       comment:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           username:
 *                             type: string
 *                           avatar:
 *                             type: string
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à voir les tentatives pour ce challenge
 *       404:
 *         description: Challenge non trouvé
 */
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendError(
        res,
        "Utilisateur non authentifié",
        401,
        "NOT_AUTHENTICATED"
      );
    }

    const flagAttempts = await getFlagAttemptsByChallenge(challengeId, userId);

    return sendSuccess(
      res,
      "Tentatives de flag récupérées avec succès",
      flagAttempts
    );
  } catch (error) {
    console.error("Erreur lors de la récupération des tentatives de flag:", error);
    if (error instanceof Error) {
      if (error.message === "Challenge non trouvé") {
        return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
      }
      if (error.message === "Non autorisé à voir les tentatives pour ce challenge") {
        return sendError(res, error.message, 403, "FORBIDDEN_ACTION");
      }
    }
    return sendError(
      res,
      "Erreur lors de la récupération des tentatives de flag",
      500,
      "SERVER_ERROR"
    );
  }
});

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/flagAttempts/{flagAttemptId}:
 *   get:
 *     summary: Détails d'une tentative de flag
 *     description: Récupère les détails d'une tentative de flag spécifique
 *     tags: [FlagAttempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'événement
 *       - in: path
 *         name: challengeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du challenge
 *       - in: path
 *         name: flagAttemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la tentative de flag
 *     responses:
 *       200:
 *         description: Détails de la tentative de flag
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Tentative de flag récupérée avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     flagValue:
 *                       type: string
 *                     isSuccess:
 *                       type: boolean
 *                     comment:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         username:
 *                           type: string
 *                         avatar:
 *                           type: string
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à voir cette tentative
 *       404:
 *         description: Tentative de flag non trouvée
 */
router.get("/:flagAttemptId", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { flagAttemptId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendError(
        res,
        "Utilisateur non authentifié",
        401,
        "NOT_AUTHENTICATED"
      );
    }

    const flagAttempt = await getFlagAttemptById(flagAttemptId, userId);

    return sendSuccess(
      res,
      "Tentative de flag récupérée avec succès",
      flagAttempt
    );
  } catch (error) {
    console.error("Erreur lors de la récupération de la tentative de flag:", error);
    if (error instanceof Error) {
      if (error.message === "Tentative de flag non trouvée") {
        return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
      }
      if (error.message === "Non autorisé à voir cette tentative") {
        return sendError(res, error.message, 403, "FORBIDDEN_ACTION");
      }
    }
    return sendError(
      res,
      "Erreur lors de la récupération de la tentative de flag",
      500,
      "SERVER_ERROR"
    );
  }
});

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/flagAttempts/{flagAttemptId}/comment:
 *   post:
 *     summary: Ajouter un commentaire à une tentative de flag
 *     description: Ajoute ou met à jour un commentaire sur une tentative de flag
 *     tags: [FlagAttempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'événement
 *       - in: path
 *         name: challengeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du challenge
 *       - in: path
 *         name: flagAttemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la tentative de flag
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *                 description: Commentaire à ajouter
 *                 example: Ce flag était un leurre
 *     responses:
 *       200:
 *         description: Commentaire ajouté avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Commentaire ajouté avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     flagValue:
 *                       type: string
 *                     isSuccess:
 *                       type: boolean
 *                     comment:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à modifier cette tentative
 *       404:
 *         description: Tentative de flag non trouvée
 */
router.post(
  "/:flagAttemptId/comment",
  authenticateJWT,
  validate(addCommentSchema),
  async (req: Request, res: Response) => {
    try {
      const { flagAttemptId } = req.params;
      const { comment } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      const updatedFlagAttempt = await addCommentToFlagAttempt(
        flagAttemptId,
        comment,
        userId
      );

      return sendSuccess(
        res,
        "Commentaire ajouté avec succès",
        updatedFlagAttempt
      );
    } catch (error) {
      console.error("Erreur lors de l'ajout du commentaire:", error);
      if (error instanceof Error) {
        if (error.message === "Tentative de flag non trouvée") {
          return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (error.message === "Non autorisé à modifier cette tentative") {
          return sendError(res, error.message, 403, "FORBIDDEN_ACTION");
        }
      }
      return sendError(
        res,
        "Erreur lors de l'ajout du commentaire",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

export default router;
