import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT } from "../../../../../middlewares/authMiddleware";
import { validate } from "../../../../../middlewares/validationMiddleware";
import { createTeamForEvent } from "../../../../../services/teams/teamService";
import { createTeamSchema } from "../../../../../validation/teamValidation";

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/v1/events/{eventId}/teams:
 *   post:
 *     summary: Créer une équipe pour un événement
 *     description: Crée une nouvelle équipe et l'associe à l'événement spécifié
 *     tags: [Teams]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom de l'équipe
 *                 example: Team Awesome
 *               description:
 *                 type: string
 *                 description: Description de l'équipe
 *                 example: Une équipe de hackers passionnés
 *               avatar:
 *                 type: string
 *                 description: URL de l'avatar de l'équipe
 *     responses:
 *       201:
 *         description: Équipe créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Équipe créée avec succès et associée à l'événement
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
 *       400:
 *         description: Données d'entrée invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Événement non trouvé
 */
router.post(
  "/",
  authenticateJWT,
  validate(createTeamSchema),
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { name, description, avatar } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      const result = await createTeamForEvent(
        name,
        description,
        avatar,
        userId,
        eventId
      );

      return res.status(201).json({
        message: "Équipe créée avec succès et associée à l'événement",
        team: result.team,
        eventTeam: result.eventTeam,
      });
    } catch (error) {
      console.error("Erreur lors de la création de l'équipe:", error);
      if (error instanceof Error) {
        if (error.message === "Événement non trouvé") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === "Une équipe avec ce nom existe déjà") {
          return res.status(400).json({ message: error.message });
        }
      }
      return res.status(500).json({
        message: "Erreur lors de la création de l'équipe",
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{eventId}/teams:
 *   get:
 *     summary: Équipes d'un événement
 *     description: Récupère la liste des équipes associées à un événement
 *     tags: [Teams]
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
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Événement non trouvé
 */
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    // Cette fonctionnalité sera implémentée ultérieurement
    // Pour l'instant, nous renvoyons une réponse vide
    return res.json({
      teams: [],
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des équipes:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des équipes",
    });
  }
});

export default router;
