import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT } from "../../../../middlewares/authMiddleware";
import { validate } from "../../../../middlewares/validationMiddleware";
import {
  getTeamById,
  getUserTeams,
  joinTeamWithInviteCode,
} from "../../../../services/teams/teamService";
import { sendError, sendSuccess } from "../../../../utils/responseHandler";
import { joinTeamSchema } from "../../../../validation/teamValidation";
import { info, warn, error, logError } from "../../../../utils/logger";

// Create router instance
const router = express.Router();

/**
 * @swagger
 * /api/v1/teams:
 *   get:
 *     summary: Liste des équipes
 *     description: Récupère la liste des équipes de l'utilisateur connecté
 *     tags: [Équipes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des équipes récupérée avec succès
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
 *                   example: Liste des équipes récupérée avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     teams:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           inviteCode:
 *                             type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Non authentifié
 */
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendError(
        res,
        "Utilisateur non authentifié",
        401,
        "NOT_AUTHENTICATED"
      );
    }

    const teams = await getUserTeams(userId);

    return sendSuccess(res, "Liste des équipes récupérée avec succès", {
      teams,
    });
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      "Erreur lors de la récupération des équipes"
    );
    return sendError(
      res,
      "Erreur lors de la récupération des équipes",
      500,
      "SERVER_ERROR"
    );
  }
});

/**
 * @swagger
 * /api/v1/teams/{teamId}:
 *   get:
 *     summary: Détails d'une équipe
 *     description: Récupère les détails d'une équipe spécifique
 *     tags: [Équipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'équipe
 *     responses:
 *       200:
 *         description: Détails de l'équipe récupérés avec succès
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
 *                   example: Détails de l'équipe récupérés avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     team:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         inviteCode:
 *                           type: string
 *                         members:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               username:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Équipe non trouvée
 */
router.get("/:teamId", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.user?.userId;

    if (!userId) {
      return sendError(
        res,
        "Utilisateur non authentifié",
        401,
        "NOT_AUTHENTICATED"
      );
    }

    const team = await getTeamById(teamId, userId);

    if (!team) {
      return sendError(res, "Équipe non trouvée", 404, "TEAM_NOT_FOUND");
    }

    return sendSuccess(res, "Détails de l'équipe récupérés avec succès", {
      team,
    });
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      "Erreur lors de la récupération de l'équipe"
    );
    if (error instanceof Error) {
      if (error.message === "Accès non autorisé à cette équipe") {
        return sendError(res, error.message, 403, "FORBIDDEN_ACCESS");
      }
      if (error.message === "Équipe non trouvée") {
        return sendError(res, error.message, 404, "TEAM_NOT_FOUND");
      }
    }
    return sendError(
      res,
      "Erreur lors de la récupération de l'équipe",
      500,
      "SERVER_ERROR"
    );
  }
});

/**
 * @swagger
 * /api/v1/teams/join:
 *   post:
 *     summary: Rejoindre une équipe
 *     description: Rejoint une équipe avec un code d'invitation
 *     tags: [Équipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteCode
 *             properties:
 *               inviteCode:
 *                 type: string
 *                 description: Code d'invitation de l'équipe
 *                 example: abc123
 *     responses:
 *       200:
 *         description: Équipe rejointe avec succès
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
 *                   example: Équipe rejointe avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     team:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Données d'entrée invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Équipe non trouvée
 */
router.post(
  "/join",
  authenticateJWT,
  validate(joinTeamSchema),
  async (req: Request, res: Response) => {
    try {
      const { inviteCode } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      const team = await joinTeamWithInviteCode(inviteCode, userId);

      return sendSuccess(res, "Équipe rejointe avec succès", { team });
    } catch (error) {
      console.error(
        "Erreur lors de la tentative de rejoindre l'équipe:",
        error
      );
      if (error instanceof Error) {
        if (error.message === "Code d'invitation invalide") {
          return sendError(res, error.message, 400, "INVALID_INVITE_CODE");
        }
        if (error.message === "Vous êtes déjà membre de cette équipe") {
          return sendError(res, error.message, 400, "ALREADY_TEAM_MEMBER");
        }
      }
      return sendError(
        res,
        "Erreur lors de la tentative de rejoindre l'équipe",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

export default router;
