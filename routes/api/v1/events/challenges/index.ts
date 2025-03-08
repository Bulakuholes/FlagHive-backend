import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT } from "../../../../../middlewares/authMiddleware";
import { validate } from "../../../../../middlewares/validationMiddleware";
import {
  assignUserToChallenge,
  createChallenge,
  getChallengeById,
  getChallengesByEventId,
  solveChallenge,
} from "../../../../../services/challenges/challengeService";
import { sendError, sendSuccess } from "../../../../../utils/responseHandler";
import {
  assignChallengeSchema,
  createChallengeSchema,
  solveChallengeSchema,
} from "../../../../../validation/challengeValidation";

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges:
 *   post:
 *     summary: Créer un challenge
 *     description: Crée un nouveau challenge pour un événement et une équipe
 *     tags: [Challenges]
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
 *               - description
 *               - category
 *               - points
 *               - teamId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom du challenge
 *                 example: Challenge Web
 *               description:
 *                 type: string
 *                 description: Description du challenge
 *                 example: Un challenge de sécurité web
 *               category:
 *                 type: string
 *                 description: Catégorie du challenge
 *                 example: web
 *               points:
 *                 type: integer
 *                 description: Points attribués pour la résolution du challenge
 *                 example: 100
 *               teamId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de l'équipe
 *               flag:
 *                 type: string
 *                 description: Flag à trouver pour résoudre le challenge
 *                 example: flag{test_flag}
 *     responses:
 *       201:
 *         description: Challenge créé avec succès
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
 *                   example: Challenge créé avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     challenge:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         category:
 *                           type: string
 *                         points:
 *                           type: integer
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
 *       403:
 *         description: Non autorisé à créer un challenge pour cet événement
 *       404:
 *         description: Événement non trouvé
 */
router.post(
  "/",
  authenticateJWT,
  validate(createChallengeSchema),
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { name, description, category, points, teamId, flag } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      const challenge = await createChallenge(
        name,
        description,
        category,
        points,
        teamId,
        eventId,
        userId
      );

      return sendSuccess(res, "Challenge créé avec succès", { challenge }, 201);
    } catch (error) {
      console.error("Erreur lors de la création du challenge:", error);
      if (error instanceof Error) {
        if (
          error.message === "Événement non trouvé" ||
          error.message === "Équipe non trouvée"
        ) {
          return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (
          error.message ===
          "Non autorisé à créer un challenge pour cet événement"
        ) {
          return sendError(res, error.message, 403, "FORBIDDEN_ACTION");
        }
      }
      return sendError(
        res,
        "Erreur lors de la création du challenge",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges:
 *   get:
 *     summary: Challenges d'un événement
 *     description: Récupère la liste des challenges d'un événement
 *     tags: [Challenges]
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
 *         description: Liste des challenges récupérée avec succès
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
 *                   example: Liste des challenges récupérée avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     challenges:
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
 *                           category:
 *                             type: string
 *                           points:
 *                             type: integer
 *                           solved:
 *                             type: boolean
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
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
      return sendError(
        res,
        "Utilisateur non authentifié",
        401,
        "NOT_AUTHENTICATED"
      );
    }

    const challenges = await getChallengesByEventId(eventId, userId);

    return sendSuccess(res, "Liste des challenges récupérée avec succès", {
      challenges,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des challenges:", error);
    if (error instanceof Error) {
      if (error.message === "Événement non trouvé") {
        return sendError(res, error.message, 404, "EVENT_NOT_FOUND");
      }
      if (error.message === "Non autorisé à accéder à cet événement") {
        return sendError(res, error.message, 403, "FORBIDDEN_ACCESS");
      }
    }
    return sendError(
      res,
      "Erreur lors de la récupération des challenges",
      500,
      "SERVER_ERROR"
    );
  }
});

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}:
 *   get:
 *     summary: Détails d'un challenge
 *     description: Récupère les détails d'un challenge spécifique
 *     tags: [Challenges]
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
 *         description: Détails du challenge récupérés avec succès
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
 *                   example: Détails du challenge récupérés avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     challenge:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         category:
 *                           type: string
 *                         points:
 *                           type: integer
 *                         solved:
 *                           type: boolean
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à accéder à ce challenge
 *       404:
 *         description: Challenge non trouvé
 */
router.get(
  "/:challengeId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const { eventId, challengeId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      const challenge = await getChallengeById(challengeId, eventId, userId);

      if (!challenge) {
        return sendError(
          res,
          "Challenge non trouvé",
          404,
          "CHALLENGE_NOT_FOUND"
        );
      }

      return sendSuccess(res, "Détails du challenge récupérés avec succès", {
        challenge,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération du challenge:", error);
      if (error instanceof Error) {
        if (
          error.message === "Challenge non trouvé" ||
          error.message === "Événement non trouvé"
        ) {
          return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (error.message === "Non autorisé à accéder à ce challenge") {
          return sendError(res, error.message, 403, "FORBIDDEN_ACCESS");
        }
      }
      return sendError(
        res,
        "Erreur lors de la récupération du challenge",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/solve:
 *   post:
 *     summary: Résoudre un challenge
 *     description: Soumet un flag pour résoudre un challenge
 *     tags: [Challenges]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - flag
 *             properties:
 *               flag:
 *                 type: string
 *                 description: Flag soumis pour résoudre le challenge
 *                 example: flag{test_flag}
 *     responses:
 *       200:
 *         description: Challenge résolu avec succès
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
 *                   example: Challenge résolu avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     solved:
 *                       type: boolean
 *                       example: true
 *                     points:
 *                       type: integer
 *                       example: 100
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Flag incorrect
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à résoudre ce challenge
 *       404:
 *         description: Challenge non trouvé
 */
router.post(
  "/:challengeId/solve",
  authenticateJWT,
  validate(solveChallengeSchema),
  async (req: Request, res: Response) => {
    try {
      const { eventId, challengeId } = req.params;
      const { flag } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      const result = await solveChallenge(challengeId, eventId, userId, flag);

      if (!result.solved) {
        return sendError(res, "Flag incorrect", 400, "INCORRECT_FLAG");
      }

      return sendSuccess(res, "Challenge résolu avec succès", {
        solved: result.solved,
        points: result.points,
      });
    } catch (error) {
      console.error("Erreur lors de la résolution du challenge:", error);
      if (error instanceof Error) {
        if (
          error.message === "Challenge non trouvé" ||
          error.message === "Événement non trouvé"
        ) {
          return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (error.message === "Challenge déjà résolu") {
          return sendError(res, error.message, 400, "CHALLENGE_ALREADY_SOLVED");
        }
        if (error.message === "Non autorisé à résoudre ce challenge") {
          return sendError(res, error.message, 403, "FORBIDDEN_ACTION");
        }
      }
      return sendError(
        res,
        "Erreur lors de la résolution du challenge",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/assign:
 *   post:
 *     summary: Assigner un utilisateur à un challenge
 *     description: Assigne un utilisateur à un challenge spécifique
 *     tags: [Challenges]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de l'utilisateur à assigner
 *     responses:
 *       200:
 *         description: Utilisateur assigné avec succès
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
 *                   example: Utilisateur assigné avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     assignment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         userId:
 *                           type: string
 *                           format: uuid
 *                         challengeId:
 *                           type: string
 *                           format: uuid
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
 *       403:
 *         description: Non autorisé à assigner un utilisateur à ce challenge
 *       404:
 *         description: Challenge ou utilisateur non trouvé
 */
router.post(
  "/:challengeId/assign",
  authenticateJWT,
  validate(assignChallengeSchema),
  async (req: Request, res: Response) => {
    try {
      const { eventId, challengeId } = req.params;
      const { userId: targetUserId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      const assignment = await assignUserToChallenge(
        challengeId,
        targetUserId,
        userId
      );

      return sendSuccess(res, "Utilisateur assigné avec succès", {
        assignment,
      });
    } catch (error) {
      console.error("Erreur lors de l'assignation de l'utilisateur:", error);
      if (error instanceof Error) {
        if (
          error.message === "Challenge non trouvé" ||
          error.message === "Événement non trouvé" ||
          error.message === "Utilisateur non trouvé"
        ) {
          return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (error.message === "Utilisateur déjà assigné à ce challenge") {
          return sendError(res, error.message, 400, "USER_ALREADY_ASSIGNED");
        }
        if (
          error.message ===
          "Non autorisé à assigner un utilisateur à ce challenge"
        ) {
          return sendError(res, error.message, 403, "FORBIDDEN_ACTION");
        }
      }
      return sendError(
        res,
        "Erreur lors de l'assignation de l'utilisateur",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

export default router;
