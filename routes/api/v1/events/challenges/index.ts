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
 *                 message:
 *                   type: string
 *                   example: Challenge créé avec succès
 *                 challenge:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     category:
 *                       type: string
 *                     points:
 *                       type: integer
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
        return res.status(401).json({ message: "Utilisateur non authentifié" });
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

      return res.status(201).json({
        message: "Challenge créé avec succès",
        challenge,
      });
    } catch (error) {
      console.error("Erreur lors de la création du challenge:", error);
      if (error instanceof Error) {
        if (
          error.message === "Événement non trouvé" ||
          error.message === "Équipe non trouvée"
        ) {
          return res.status(404).json({ message: error.message });
        }
        if (
          error.message ===
          "Non autorisé à créer un challenge pour cet événement"
        ) {
          return res.status(403).json({ message: error.message });
        }
      }
      return res.status(500).json({
        message: "Erreur lors de la création du challenge",
      });
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
 *                 challenges:
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
 *                       category:
 *                         type: string
 *                       points:
 *                         type: integer
 *                       solved:
 *                         type: boolean
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à accéder aux challenges de cet événement
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

    const challenges = await getChallengesByEventId(eventId, userId);

    return res.json({
      challenges,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des challenges:", error);
    if (error instanceof Error) {
      if (error.message === "Événement non trouvé") {
        return res.status(404).json({ message: error.message });
      }
      if (
        error.message ===
        "Non autorisé à accéder aux challenges de cet événement"
      ) {
        return res.status(403).json({ message: error.message });
      }
    }
    return res.status(500).json({
      message: "Erreur lors de la récupération des challenges",
    });
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
 *                 challenge:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     category:
 *                       type: string
 *                     points:
 *                       type: integer
 *                     solved:
 *                       type: boolean
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
      const { challengeId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      const challenge = await getChallengeById(challengeId, userId);

      return res.json({
        challenge,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération du challenge:", error);
      if (error instanceof Error) {
        if (error.message === "Challenge non trouvé") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === "Vous n'avez pas accès à ce challenge") {
          return res.status(403).json({ message: error.message });
        }
      }
      return res.status(500).json({
        message: "Erreur lors de la récupération du challenge",
      });
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
 *         description: Flag correct, challenge résolu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Félicitations ! Flag correct.
 *                 solved:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Données d'entrée invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à résoudre ce challenge
 *       404:
 *         description: Challenge non trouvé
 *       422:
 *         description: Flag incorrect
 */
router.post(
  "/:challengeId/solve",
  authenticateJWT,
  validate(solveChallengeSchema),
  async (req: Request, res: Response) => {
    try {
      const { challengeId } = req.params;
      const { flag } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      const result = await solveChallenge(challengeId, flag, userId);

      if (result.solved) {
        return res.json({
          message: "Félicitations ! Flag correct.",
          solved: true,
        });
      } else {
        return res.status(422).json({
          message: "Flag incorrect. Réessayez.",
          solved: false,
        });
      }
    } catch (error) {
      console.error("Erreur lors de la résolution du challenge:", error);
      if (error instanceof Error) {
        if (error.message === "Challenge non trouvé") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === "Vous n'avez pas accès à ce challenge") {
          return res.status(403).json({ message: error.message });
        }
        if (error.message === "Ce challenge est déjà résolu") {
          return res.status(400).json({ message: error.message });
        }
      }
      return res.status(500).json({
        message: "Erreur lors de la résolution du challenge",
      });
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
 *                 message:
 *                   type: string
 *                   example: Utilisateur assigné au challenge avec succès
 *                 assignment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     challengeId:
 *                       type: string
 *                       format: uuid
 *                     userId:
 *                       type: string
 *                       format: uuid
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
      const { challengeId } = req.params;
      const { userId: targetUserId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      const assignment = await assignUserToChallenge(
        challengeId,
        targetUserId,
        userId
      );

      return res.json({
        message: "Utilisateur assigné au challenge avec succès",
        assignment,
      });
    } catch (error) {
      console.error("Erreur lors de l'assignation au challenge:", error);
      if (error instanceof Error) {
        if (
          error.message === "Challenge non trouvé" ||
          error.message === "Utilisateur non trouvé"
        ) {
          return res.status(404).json({ message: error.message });
        }
        if (
          error.message ===
          "Non autorisé à assigner un utilisateur à ce challenge"
        ) {
          return res.status(403).json({ message: error.message });
        }
        if (
          error.message === "Cet utilisateur est déjà assigné à ce challenge"
        ) {
          return res.status(400).json({ message: error.message });
        }
      }
      return res.status(500).json({
        message: "Erreur lors de l'assignation au challenge",
      });
    }
  }
);

export default router;
