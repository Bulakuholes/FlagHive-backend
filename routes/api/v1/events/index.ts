import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT } from "../../../../middlewares/authMiddleware";
import { validate } from "../../../../middlewares/validationMiddleware";
import {
  createEvent,
  getEventById,
  getEvents,
} from "../../../../services/events/eventService";
import { sendError, sendSuccess } from "../../../../utils/responseHandler";
import { createEventSchema } from "../../../../validation/eventValidation";
import challengesRoutes from "./challenges";
import challengeNotesRoutes from "./challenges/notes";
import teamsRoutes from "./teams";
import { info, warn, error, logError } from "../../../../utils/logger";

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
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         events:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               startDate:
 *                                 type: string
 *                                 format: date-time
 *                               endDate:
 *                                 type: string
 *                                 format: date-time
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendError(res, "Utilisateur non authentifié", 401, "UNAUTHORIZED");
    }

    const events = await getEvents(userId);

    return sendSuccess(res, "Liste des événements récupérée avec succès", {
      events,
    });
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      "Erreur lors de la récupération des événements"
    );
    return sendError(
      res,
      "Erreur lors de la récupération des événements",
      500,
      "SERVER_ERROR"
    );
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
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         event:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                             startDate:
 *                               type: string
 *                               format: date-time
 *                             endDate:
 *                               type: string
 *                               format: date-time
 *                             website:
 *                               type: string
 *                             ctfdUrl:
 *                               type: string
 *       400:
 *         description: Données d'entrée invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "UNAUTHORIZED"
        );
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

      return sendSuccess(res, "Événement créé avec succès", { event }, 201);
    } catch (error) {
      logError(
        error instanceof Error ? error : new Error(String(error)),
        "Erreur lors de la création de l'événement"
      );
      return sendError(
        res,
        "Erreur lors de la création de l'événement",
        500,
        "SERVER_ERROR"
      );
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
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         event:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                             startDate:
 *                               type: string
 *                               format: date-time
 *                             endDate:
 *                               type: string
 *                               format: date-time
 *                             website:
 *                               type: string
 *                             ctfdUrl:
 *                               type: string
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Non autorisé à accéder à cet événement
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Événement non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/:eventId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "UNAUTHORIZED"
        );
      }

      const event = await getEventById(eventId, userId);

      return sendSuccess(res, "Détails de l'événement récupérés avec succès", {
        event,
      });
    } catch (error) {
      logError(
        error instanceof Error ? error : new Error(String(error)),
        "Erreur lors de la récupération de l'événement"
      );
      if (error instanceof Error) {
        if (error.message === "Événement non trouvé") {
          return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (error.message === "Non autorisé à accéder à cet événement") {
          return sendError(res, error.message, 403, "FORBIDDEN_ACCESS");
        }
      }
      return sendError(
        res,
        "Erreur lors de la récupération de l'événement",
        500,
        "SERVER_ERROR"
      );
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
