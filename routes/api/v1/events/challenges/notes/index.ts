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
import { logError } from "../../../../../../utils/logger";
import {
  sendError,
  sendSuccess,
} from "../../../../../../utils/responseHandler";
import { addNoteSchema } from "../../../../../../validation/challengeValidation";

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/notes:
 *   get:
 *     summary: Liste des notes d'un challenge
 *     description: Récupère la liste des notes associées à un challenge spécifique
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
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notes:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               content:
 *                                 type: string
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                               updatedAt:
 *                                 type: string
 *                                 format: date-time
 *                               userId:
 *                                 type: string
 *                                 format: uuid
 *                               user:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                     format: uuid
 *                                   username:
 *                                     type: string
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Non autorisé à accéder à ce challenge
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Événement ou challenge non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendError(res, "Utilisateur non authentifié", 401, "UNAUTHORIZED");
    }

    const notes = await getNotesByChallengeId(challengeId, userId);

    return sendSuccess(res, "Notes récupérées avec succès", { notes });
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      "Erreur lors de la récupération des notes"
    );
    if (error instanceof Error) {
      if (error.message === "Challenge non trouvé") {
        return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
      }
      if (
        error.message === "Non autorisé à accéder aux notes de ce challenge"
      ) {
        return sendError(res, error.message, 403, "FORBIDDEN_ACCESS");
      }
    }
    return sendError(
      res,
      "Erreur lors de la récupération des notes",
      500,
      "SERVER_ERROR"
    );
  }
});

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/notes:
 *   post:
 *     summary: Créer une note pour un challenge
 *     description: Crée une nouvelle note associée à un challenge spécifique
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
 *     responses:
 *       201:
 *         description: Note créée avec succès
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
 *                         note:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             content:
 *                               type: string
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                             updatedAt:
 *                               type: string
 *                               format: date-time
 *                             userId:
 *                               type: string
 *                               format: uuid
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
 *       403:
 *         description: Non autorisé à accéder à ce challenge
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Événement ou challenge non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "UNAUTHORIZED"
        );
      }

      const note = await addNoteToChallenge(challengeId, content, userId);

      return sendSuccess(res, "Note ajoutée avec succès", { note }, 201);
    } catch (error) {
      logError(
        error instanceof Error ? error : new Error(String(error)),
        "Erreur lors de l'ajout de la note"
      );
      if (error instanceof Error) {
        if (error.message === "Challenge non trouvé") {
          return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (
          error.message === "Non autorisé à ajouter une note à ce challenge"
        ) {
          return sendError(res, error.message, 403, "FORBIDDEN_ACCESS");
        }
      }
      return sendError(
        res,
        "Erreur lors de l'ajout de la note",
        500,
        "SERVER_ERROR"
      );
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
      return sendError(res, "Utilisateur non authentifié", 401, "UNAUTHORIZED");
    }

    const note = await updateNoteById(noteId, content, userId);

    return sendSuccess(res, "Note modifiée avec succès", { note });
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      "Erreur lors de la modification de la note"
    );
    if (error instanceof Error) {
      if (error.message === "Note non trouvée") {
        return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
      }
      if (error.message === "Non autorisé à modifier cette note") {
        return sendError(res, error.message, 403, "FORBIDDEN_ACCESS");
      }
    }
    return sendError(
      res,
      "Erreur lors de la modification de la note",
      500,
      "SERVER_ERROR"
    );
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
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "UNAUTHORIZED"
        );
      }

      await deleteNoteById(noteId, userId);

      return sendSuccess(res, "Note supprimée avec succès");
    } catch (error) {
      logError(
        error instanceof Error ? error : new Error(String(error)),
        "Erreur lors de la suppression de la note"
      );
      if (error instanceof Error) {
        if (error.message === "Note non trouvée") {
          return sendError(res, error.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (error.message === "Non autorisé à supprimer cette note") {
          return sendError(res, error.message, 403, "FORBIDDEN_ACCESS");
        }
      }
      return sendError(
        res,
        "Erreur lors de la suppression de la note",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

export default router;
