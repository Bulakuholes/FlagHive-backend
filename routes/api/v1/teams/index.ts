import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT } from "../../../../middlewares/authMiddleware";
import { validate } from "../../../../middlewares/validationMiddleware";
import {
  getTeamById,
  getUserTeams,
  joinTeamWithInviteCode,
} from "../../../../services/teams/teamService";
import { joinTeamSchema } from "../../../../validation/teamValidation";

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
 *                 teams:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       inviteCode:
 *                         type: string
 *       401:
 *         description: Non authentifié
 */
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const teams = await getUserTeams(userId);

    return res.json({ teams });
  } catch (error) {
    console.error("Erreur lors de la récupération des équipes:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des équipes",
    });
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
 *                 team:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     inviteCode:
 *                       type: string
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
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
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const team = await getTeamById(teamId, userId);

    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée" });
    }

    return res.json({ team });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'équipe:", error);
    if (error instanceof Error) {
      if (error.message === "Accès non autorisé à cette équipe") {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === "Équipe non trouvée") {
        return res.status(404).json({ message: error.message });
      }
    }
    return res.status(500).json({
      message: "Erreur lors de la récupération de l'équipe",
    });
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
 *                 message:
 *                   type: string
 *                   example: Équipe rejointe avec succès
 *                 team:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *       400:
 *         description: Données d'entrée invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Équipe non trouvée
 *       409:
 *         description: Utilisateur déjà membre de l'équipe
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
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      if (!inviteCode) {
        return res
          .status(400)
          .json({ message: "Le code d'invitation est requis" });
      }

      const team = await joinTeamWithInviteCode(inviteCode, userId);

      return res.json({
        message: "Vous avez rejoint l'équipe avec succès",
        team,
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout à l'équipe:", error);
      if (error instanceof Error) {
        if (error.message === "Code d'invitation invalide") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === "Vous êtes déjà membre de cette équipe") {
          return res.status(409).json({ message: error.message });
        }
      }
      return res.status(500).json({
        message: "Erreur lors de l'ajout à l'équipe",
      });
    }
  }
);

export default router;
