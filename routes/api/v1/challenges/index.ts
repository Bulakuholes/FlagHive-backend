import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT } from "../../../../middlewares/authMiddleware";
import { validate } from "../../../../middlewares/validationMiddleware";
import {
  assignUserToChallenge,
  createChallenge,
  getChallengeById,
  getChallengesByTeamId,
  solveChallenge,
} from "../../../../services/challenges/challengeService";
import {
  assignChallengeSchema,
  createChallengeSchema,
  solveChallengeSchema,
} from "../../../../validation/challengeValidation";

const router = express.Router();

/**
 * @swagger
 * /api/v1/challenges:
 *   post:
 *     summary: Créer un challenge
 *     description: Crée un nouveau challenge pour une équipe
 *     tags: [Challenges]
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
 *         description: Non autorisé à créer un challenge pour cette équipe
 */
router.post(
  "/",
  authenticateJWT,
  validate(createChallengeSchema),
  async (req: Request, res: Response) => {
    try {
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
        undefined, // eventId
        userId
      );

      return res.status(201).json({
        message: "Challenge créé avec succès",
        challenge,
      });
    } catch (error) {
      console.error("Erreur lors de la création du challenge:", error);
      if (error instanceof Error) {
        if (error.message === "Équipe non trouvée") {
          return res.status(404).json({ message: error.message });
        }
        if (
          error.message ===
          "Non autorisé à créer un challenge pour cette équipe"
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
 * /api/v1/challenges/team/{teamId}:
 *   get:
 *     summary: Challenges d'une équipe
 *     description: Récupère la liste des challenges d'une équipe
 *     tags: [Challenges]
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
 *         description: Non autorisé à accéder aux challenges de cette équipe
 *       404:
 *         description: Équipe non trouvée
 */
router.get(
  "/team/:teamId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      const challenges = await getChallengesByTeamId(teamId, userId);

      return res.json({
        challenges,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des challenges:", error);
      if (error instanceof Error) {
        if (error.message === "Équipe non trouvée") {
          return res.status(404).json({ message: error.message });
        }
        if (
          error.message ===
          "Non autorisé à accéder aux challenges de cette équipe"
        ) {
          return res.status(403).json({ message: error.message });
        }
      }
      return res.status(500).json({
        message: "Erreur lors de la récupération des challenges",
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/challenges/{challengeId}:
 *   get:
 *     summary: Détails d'un challenge
 *     description: Récupère les détails d'un challenge spécifique
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *                     assignedUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           username:
 *                             type: string
 *                     notes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           content:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               username:
 *                                 type: string
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

      if (!challenge) {
        return res.status(404).json({ message: "Challenge non trouvé" });
      }

      return res.json({
        challenge,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération du challenge:", error);
      if (error instanceof Error) {
        if (error.message === "Non autorisé à accéder à ce challenge") {
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
 * /api/v1/challenges/{challengeId}/solve:
 *   post:
 *     summary: Résoudre un challenge
 *     description: Soumet un flag pour résoudre un challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *                 description: Flag à soumettre
 *                 example: flag{test_flag}
 *     responses:
 *       200:
 *         description: Challenge résolu avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Challenge résolu avec succès
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 points:
 *                   type: integer
 *                   example: 100
 *       400:
 *         description: Données d'entrée invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à résoudre ce challenge
 *       404:
 *         description: Challenge non trouvé
 *       409:
 *         description: Challenge déjà résolu
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

      const challenge = await solveChallenge(challengeId, flag, userId);

      // Déterminer si le challenge a été résolu avec succès
      const success = challenge && challenge.solved;
      const points = challenge?.points || 0;

      return res.json({
        message: success ? "Challenge résolu avec succès" : "Flag incorrect",
        success: success,
        points: points,
      });
    } catch (error) {
      console.error("Erreur lors de la résolution du challenge:", error);
      if (error instanceof Error) {
        if (error.message === "Challenge non trouvé") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === "Non autorisé à résoudre ce challenge") {
          return res.status(403).json({ message: error.message });
        }
        if (error.message === "Challenge déjà résolu") {
          return res.status(409).json({ message: error.message });
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
 * /api/v1/challenges/{challengeId}/assign:
 *   post:
 *     summary: S'assigner à un challenge
 *     description: Permet à un utilisateur de s'assigner à un challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: challengeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du challenge
 *     responses:
 *       200:
 *         description: Utilisateur assigné au challenge avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Utilisateur assigné au challenge avec succès
 *                 challenge:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à s'assigner à ce challenge
 *       404:
 *         description: Challenge non trouvé
 *       409:
 *         description: Utilisateur déjà assigné à ce challenge
 */
router.post(
  "/:challengeId/assign",
  authenticateJWT,
  validate(assignChallengeSchema),
  async (req: Request, res: Response) => {
    try {
      const { challengeId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      const challenge = await assignUserToChallenge(challengeId, userId);

      return res.json({
        message: "Utilisateur assigné au challenge avec succès",
        challenge,
      });
    } catch (error) {
      console.error("Erreur lors de l'assignation au challenge:", error);
      if (error instanceof Error) {
        if (error.message === "Challenge non trouvé") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === "Non autorisé à s'assigner à ce challenge") {
          return res.status(403).json({ message: error.message });
        }
        if (error.message === "Utilisateur déjà assigné à ce challenge") {
          return res.status(409).json({ message: error.message });
        }
      }
      return res.status(500).json({
        message: "Erreur lors de l'assignation au challenge",
      });
    }
  }
);

export default router;
