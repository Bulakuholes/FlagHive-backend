import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT } from "../../../../../../middlewares/authMiddleware";
import { validate } from "../../../../../../middlewares/validationMiddleware";
import {
  addNoteToChallenge,
  deleteNoteById,
  getNotesByChallengeId,
  updateNoteById,
} from "../../../../../../services/notes/noteService";
import { addNoteSchema } from "../../../../../../validation/challengeValidation";

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/notes:
 *   get:
 *     summary: Notes d'un challenge
 *     description: Récupère toutes les notes associées à un challenge spécifique
 *     tags: [Notes]
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
 *         description: Liste des notes récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       content:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
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
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à accéder aux notes de ce challenge
 *       404:
 *         description: Challenge non trouvé
 */
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const notes = await getNotesByChallengeId(challengeId, userId);

    return res.json({
      notes,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des notes:", error);
    if (error instanceof Error) {
      if (error.message === "Challenge non trouvé") {
        return res.status(404).json({ message: error.message });
      }
      if (
        error.message === "Non autorisé à accéder aux notes de ce challenge"
      ) {
        return res.status(403).json({ message: error.message });
      }
    }
    return res.status(500).json({
      message: "Erreur lors de la récupération des notes",
    });
  }
});

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/notes:
 *   post:
 *     summary: Ajouter une note
 *     description: Ajoute une nouvelle note à un challenge
 *     tags: [Notes]
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Contenu de la note
 *                 example: Voici une piste pour résoudre ce challenge...
 *     responses:
 *       201:
 *         description: Note ajoutée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Note ajoutée avec succès
 *                 note:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     content:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Données d'entrée invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à ajouter une note à ce challenge
 *       404:
 *         description: Challenge non trouvé
 */
router.post(
  "/",
  authenticateJWT,
  validate(addNoteSchema),
  async (req: Request, res: Response) => {
    try {
      const { challengeId } = req.params;
      const { content } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      const note = await addNoteToChallenge(challengeId, content, userId);

      return res.status(201).json({
        message: "Note ajoutée avec succès",
        note,
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout de la note:", error);
      if (error instanceof Error) {
        if (error.message === "Challenge non trouvé") {
          return res.status(404).json({ message: error.message });
        }
        if (
          error.message === "Non autorisé à ajouter une note à ce challenge"
        ) {
          return res.status(403).json({ message: error.message });
        }
      }
      return res.status(500).json({
        message: "Erreur lors de l'ajout de la note",
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/notes/{noteId}:
 *   put:
 *     summary: Modifier une note
 *     description: Modifie une note existante
 *     tags: [Notes]
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
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la note
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Nouveau contenu de la note
 *                 example: Mise à jour de la piste pour résoudre ce challenge...
 *     responses:
 *       200:
 *         description: Note modifiée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Note modifiée avec succès
 *                 note:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     content:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Données d'entrée invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à modifier cette note
 *       404:
 *         description: Note non trouvée
 */
router.put("/:noteId", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const note = await updateNoteById(noteId, content, userId);

    return res.json({
      message: "Note modifiée avec succès",
      note,
    });
  } catch (error) {
    console.error("Erreur lors de la modification de la note:", error);
    if (error instanceof Error) {
      if (error.message === "Note non trouvée") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Non autorisé à modifier cette note") {
        return res.status(403).json({ message: error.message });
      }
    }
    return res.status(500).json({
      message: "Erreur lors de la modification de la note",
    });
  }
});

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/notes/{noteId}:
 *   delete:
 *     summary: Supprimer une note
 *     description: Supprime une note existante
 *     tags: [Notes]
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
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la note
 *     responses:
 *       200:
 *         description: Note supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Note supprimée avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à supprimer cette note
 *       404:
 *         description: Note non trouvée
 */
router.delete(
  "/:noteId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const { noteId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Utilisateur non authentifié" });
      }

      await deleteNoteById(noteId, userId);

      return res.json({
        message: "Note supprimée avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de la note:", error);
      if (error instanceof Error) {
        if (error.message === "Note non trouvée") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === "Non autorisé à supprimer cette note") {
          return res.status(403).json({ message: error.message });
        }
      }
      return res.status(500).json({
        message: "Erreur lors de la suppression de la note",
      });
    }
  }
);

export default router;
