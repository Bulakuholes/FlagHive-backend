import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT } from "../../../../middlewares/authMiddleware";
import { validate } from "../../../../middlewares/validationMiddleware";
import {
  createEvent,
  getEventById,
  getEvents,
} from "../../../../services/events/eventService";
import { createEventSchema } from "../../../../validation/eventValidation";
import challengesRoutes from "./challenges";
import challengeNotesRoutes from "./challenges/notes";
import teamsRoutes from "./teams";

const router = express.Router();

/**
 * @swagger
 * /api/v1/events:
 *   get:
 *     summary: Liste des événements
 *     description: Récupère la liste des événements accessibles par l'utilisateur
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des événements récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
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
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Non authentifié
 */
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const events = await getEvents(userId);

    return res.json({
      events,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des événements:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des événements",
    });
  }
});

/**
 * @swagger
 * /api/v1/events:
 *   post:
 *     summary: Créer un événement
 *     description: Crée un nouvel événement
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom de l'événement
 *                 example: CTF Example 2025
 *               description:
 *                 type: string
 *                 description: Description de l'événement
 *                 example: Un événement CTF pour tester nos compétences
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date de début de l'événement
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date de fin de l'événement
 *               website:
 *                 type: string
 *                 description: Site web de l'événement
 *               ctfdUrl:
 *                 type: string
 *                 description: URL de l'instance CTFd
 *               ctfdApiKey:
 *                 type: string
 *                 description: Clé API pour l'instance CTFd
 *     responses:
 *       201:
 *         description: Événement créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Événement créé avec succès
 *                 event:
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
 */
router.post(
  "/",
  authenticateJWT,
  validate(createEventSchema),
  async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        startDate,
        endDate,
        website,
        ctfdUrl,
        ctfdApiKey,
      } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      const event = await createEvent(
        name,
        description,
        new Date(startDate),
        new Date(endDate),
        website,
        ctfdUrl,
        ctfdApiKey,
        userId
      );

      return res.status(201).json({
        message: "Événement créé avec succès",
        event,
      });
    } catch (error) {
      console.error("Erreur lors de la création de l'événement:", error);
      return res.status(500).json({
        message: "Erreur lors de la création de l'événement",
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{eventId}:
 *   get:
 *     summary: Détails d'un événement
 *     description: Récupère les détails d'un événement spécifique
 *     tags: [Events]
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
 *         description: Détails de l'événement récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à accéder à cet événement
 *       404:
 *         description: Événement non trouvé
 */
router.get(
  "/:eventId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      const event = await getEventById(eventId, userId);

      return res.json({
        event,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération de l'événement:", error);
      if (error instanceof Error) {
        if (error.message === "Événement non trouvé") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === "Non autorisé à accéder à cet événement") {
          return res.status(403).json({ message: error.message });
        }
      }
      return res.status(500).json({
        message: "Erreur lors de la récupération de l'événement",
      });
    }
  }
);

// Monter les sous-routes pour les challenges
router.use("/:eventId/challenges", challengesRoutes);

// Monter les sous-routes pour les notes des challenges
router.use("/:eventId/challenges/:challengeId/notes", challengeNotesRoutes);

// Monter les sous-routes pour les équipes
router.use("/:eventId/teams", teamsRoutes);

export default router;
