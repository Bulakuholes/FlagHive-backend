import type { Request, Response } from "express";
import express from "express";
import multer from "multer";
import { authenticateJWT } from "../../../../../../middlewares/authMiddleware";
import {
  addResourceToChallenge,
  deleteResource,
  getResourceById,
  getResourceContent,
  getResourcesByChallenge,
  updateResource,
} from "../../../../../../services/challenges/resourceService";
import { logError } from "../../../../../../utils/logger";
import {
  sendError,
  sendSuccess,
} from "../../../../../../utils/responseHandler";
import {
  addResourceSchema,
  updateResourceSchema,
} from "../../../../../../validation/resourceValidation";

// Déclaration correcte pour multer
declare module "express-serve-static-core" {
  interface Request {
    file?: Express.Multer.File;
  }
}

const router = express.Router({ mergeParams: true });

// Configuration de multer pour la gestion des fichiers
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Limite à 50 Mo
  },
});

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/resources:
 *   post:
 *     summary: Ajouter une ressource à un challenge
 *     description: Ajoute un fichier en tant que ressource à un challenge spécifique
 *     tags: [Resources]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier à uploader
 *               description:
 *                 type: string
 *                 description: Description de la ressource
 *               type:
 *                 type: string
 *                 description: Type de ressource (script, capture, dump, etc.)
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tags associés à la ressource
 *               visibility:
 *                 type: string
 *                 enum: [team, challenge, public]
 *                 description: Visibilité de la ressource
 *     responses:
 *       201:
 *         description: Ressource ajoutée avec succès
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
 *                   example: Ressource ajoutée avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     resource:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         filename:
 *                           type: string
 *                         size:
 *                           type: integer
 *                         mimeType:
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
 *       403:
 *         description: Non autorisé à ajouter une ressource à ce challenge
 *       404:
 *         description: Challenge ou événement non trouvé
 */
router.post(
  "/",
  authenticateJWT,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { eventId, challengeId } = req.params;
      const userId = req.user?.userId;
      const file = req.file;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      if (!file) {
        return sendError(res, "Aucun fichier fourni", 400, "NO_FILE_PROVIDED");
      }

      // Valider les métadonnées
      let metadata: any = {};

      if (req.body.description) {
        metadata.description = req.body.description;
      }

      if (req.body.type) {
        metadata.type = req.body.type;
      }

      if (req.body.tags) {
        try {
          metadata.tags = JSON.parse(req.body.tags);
        } catch (e) {
          metadata.tags = req.body.tags
            .split(",")
            .map((tag: string) => tag.trim());
        }
      }

      if (req.body.visibility) {
        metadata.visibility = req.body.visibility;
      }

      // Valider les métadonnées avec Zod
      const validationResult = addResourceSchema.safeParse(metadata);
      if (!validationResult.success) {
        return sendError(
          res,
          "Données d'entrée invalides",
          400,
          "INVALID_INPUT",
          validationResult.error
        );
      }

      // Créer un blob à partir du buffer de multer
      const blob = new Blob([file.buffer], { type: file.mimetype });
      const fileObject = new File([blob], file.originalname, {
        type: file.mimetype,
      });

      // Ajouter la ressource
      const resource = await addResourceToChallenge(
        challengeId,
        eventId,
        userId,
        fileObject as any,
        validationResult.data
      );

      return sendSuccess(
        res,
        "Ressource ajoutée avec succès",
        { resource },
        201
      );
    } catch (err) {
      logError(
        err instanceof Error ? err : new Error(String(err)),
        "Erreur lors de l'ajout de la ressource"
      );
      if (err instanceof Error) {
        if (
          err.message === "Challenge non trouvé" ||
          err.message === "Événement non trouvé"
        ) {
          return sendError(res, err.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (err.message === "Non autorisé à accéder à ce challenge") {
          return sendError(res, err.message, 403, "FORBIDDEN_ACCESS");
        }
      }
      return sendError(
        res,
        "Erreur lors de l'ajout de la ressource",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/resources:
 *   get:
 *     summary: Liste des ressources d'un challenge
 *     description: Récupère la liste des ressources associées à un challenge
 *     tags: [Resources]
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
 *         description: Liste des ressources récupérée avec succès
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
 *                   example: Liste des ressources récupérée avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     resources:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           filename:
 *                             type: string
 *                           size:
 *                             type: integer
 *                           mimeType:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               username:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à accéder aux ressources de ce challenge
 *       404:
 *         description: Challenge ou événement non trouvé
 */
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
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

    const resources = await getResourcesByChallenge(
      challengeId,
      eventId,
      userId
    );

    return sendSuccess(res, "Liste des ressources récupérée avec succès", {
      resources,
    });
  } catch (err) {
    logError(
      err instanceof Error ? err : new Error(String(err)),
      "Erreur lors de la récupération des ressources"
    );
    if (err instanceof Error) {
      if (
        err.message === "Challenge non trouvé" ||
        err.message === "Événement non trouvé"
      ) {
        return sendError(res, err.message, 404, "RESOURCE_NOT_FOUND");
      }
      if (err.message === "Non autorisé à accéder à ce challenge") {
        return sendError(res, err.message, 403, "FORBIDDEN_ACCESS");
      }
    }
    return sendError(
      res,
      "Erreur lors de la récupération des ressources",
      500,
      "SERVER_ERROR"
    );
  }
});

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/resources/{resourceId}:
 *   get:
 *     summary: Détails d'une ressource
 *     description: Récupère les détails d'une ressource spécifique
 *     tags: [Resources]
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
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la ressource
 *     responses:
 *       200:
 *         description: Détails de la ressource récupérés avec succès
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
 *                   example: Détails de la ressource récupérés avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     resource:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         filename:
 *                           type: string
 *                         size:
 *                           type: integer
 *                         mimeType:
 *                           type: string
 *                         metadata:
 *                           type: object
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             username:
 *                               type: string
 *                             avatar:
 *                               type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à accéder à cette ressource
 *       404:
 *         description: Ressource, challenge ou événement non trouvé
 */
router.get(
  "/:resourceId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const { eventId, challengeId, resourceId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      const resource = await getResourceById(
        resourceId,
        challengeId,
        eventId,
        userId
      );

      return sendSuccess(res, "Détails de la ressource récupérés avec succès", {
        resource,
      });
    } catch (err) {
      logError(
        err instanceof Error ? err : new Error(String(err)),
        "Erreur lors de la récupération de la ressource"
      );
      if (err instanceof Error) {
        if (
          err.message === "Ressource non trouvée" ||
          err.message === "Challenge non trouvé" ||
          err.message === "Événement non trouvé"
        ) {
          return sendError(res, err.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (err.message === "Non autorisé à accéder à ce challenge") {
          return sendError(res, err.message, 403, "FORBIDDEN_ACCESS");
        }
      }
      return sendError(
        res,
        "Erreur lors de la récupération de la ressource",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/resources/{resourceId}:
 *   delete:
 *     summary: Supprimer une ressource
 *     description: Supprime une ressource spécifique
 *     tags: [Resources]
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
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la ressource
 *     responses:
 *       200:
 *         description: Ressource supprimée avec succès
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
 *                   example: Ressource supprimée avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à supprimer cette ressource
 *       404:
 *         description: Ressource, challenge ou événement non trouvé
 */
router.delete(
  "/:resourceId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const { eventId, challengeId, resourceId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      await deleteResource(resourceId, challengeId, eventId, userId);

      return sendSuccess(res, "Ressource supprimée avec succès", {
        success: true,
      });
    } catch (err) {
      logError(
        err instanceof Error ? err : new Error(String(err)),
        "Erreur lors de la suppression de la ressource"
      );
      if (err instanceof Error) {
        if (
          err.message === "Ressource non trouvée" ||
          err.message === "Challenge non trouvé" ||
          err.message === "Événement non trouvé"
        ) {
          return sendError(res, err.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (
          err.message === "Non autorisé à accéder à ce challenge" ||
          err.message === "Non autorisé à supprimer cette ressource"
        ) {
          return sendError(res, err.message, 403, "FORBIDDEN_ACTION");
        }
      }
      return sendError(
        res,
        "Erreur lors de la suppression de la ressource",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/resources/{resourceId}:
 *   put:
 *     summary: Mettre à jour une ressource
 *     description: Met à jour les métadonnées ou le fichier d'une ressource
 *     tags: [Resources]
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
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la ressource
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Nouveau fichier (optionnel)
 *               description:
 *                 type: string
 *                 description: Description de la ressource
 *               type:
 *                 type: string
 *                 description: Type de ressource (script, capture, dump, etc.)
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tags associés à la ressource
 *               visibility:
 *                 type: string
 *                 enum: [team, challenge, public]
 *                 description: Visibilité de la ressource
 *     responses:
 *       200:
 *         description: Ressource mise à jour avec succès
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
 *                   example: Ressource mise à jour avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     resource:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         filename:
 *                           type: string
 *                         size:
 *                           type: integer
 *                         mimeType:
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
 *       403:
 *         description: Non autorisé à modifier cette ressource
 *       404:
 *         description: Ressource, challenge ou événement non trouvé
 */
router.put(
  "/:resourceId",
  authenticateJWT,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { eventId, challengeId, resourceId } = req.params;
      const userId = req.user?.userId;
      const file = req.file;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      // Valider les métadonnées
      let metadata: any = {};

      if (req.body.description) {
        metadata.description = req.body.description;
      }

      if (req.body.type) {
        metadata.type = req.body.type;
      }

      if (req.body.tags) {
        try {
          metadata.tags = JSON.parse(req.body.tags);
        } catch (e) {
          metadata.tags = req.body.tags
            .split(",")
            .map((tag: string) => tag.trim());
        }
      }

      if (req.body.visibility) {
        metadata.visibility = req.body.visibility;
      }

      // Valider les métadonnées avec Zod
      const validationResult = updateResourceSchema.safeParse(metadata);
      if (!validationResult.success) {
        return sendError(
          res,
          "Données d'entrée invalides",
          400,
          "INVALID_INPUT",
          validationResult.error
        );
      }

      let fileObject: any = undefined;
      if (file) {
        // Créer un blob à partir du buffer de multer
        const blob = new Blob([file.buffer], { type: file.mimetype });
        fileObject = new File([blob], file.originalname, {
          type: file.mimetype,
        });
      }

      // Mettre à jour la ressource
      const resource = await updateResource(
        resourceId,
        challengeId,
        eventId,
        userId,
        validationResult.data,
        fileObject
      );

      return sendSuccess(res, "Ressource mise à jour avec succès", {
        resource,
      });
    } catch (err) {
      logError(
        err instanceof Error ? err : new Error(String(err)),
        "Erreur lors de la mise à jour de la ressource"
      );
      if (err instanceof Error) {
        if (
          err.message === "Ressource non trouvée" ||
          err.message === "Challenge non trouvé" ||
          err.message === "Événement non trouvé"
        ) {
          return sendError(res, err.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (
          err.message === "Non autorisé à accéder à ce challenge" ||
          err.message === "Non autorisé à modifier cette ressource"
        ) {
          return sendError(res, err.message, 403, "FORBIDDEN_ACTION");
        }
      }
      return sendError(
        res,
        "Erreur lors de la mise à jour de la ressource",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{eventId}/challenges/{challengeId}/resources/{resourceId}/download:
 *   get:
 *     summary: Télécharger une ressource
 *     description: Télécharge le fichier d'une ressource spécifique
 *     tags: [Resources]
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
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la ressource
 *     responses:
 *       200:
 *         description: Fichier téléchargé
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé à télécharger cette ressource
 *       404:
 *         description: Ressource, challenge ou événement non trouvé
 */
router.get(
  "/:resourceId/download",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const { eventId, challengeId, resourceId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return sendError(
          res,
          "Utilisateur non authentifié",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      const { resource, content } = await getResourceContent(
        resourceId,
        challengeId,
        eventId,
        userId
      );

      // Configurer les en-têtes pour le téléchargement
      res.setHeader("Content-Type", resource.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(resource.filename)}"`
      );
      res.setHeader("Content-Length", resource.size.toString());

      // Envoyer le contenu du fichier directement (content est déjà un Buffer)
      res.send(content);
    } catch (err) {
      logError(
        err instanceof Error ? err : new Error(String(err)),
        "Erreur lors du téléchargement de la ressource"
      );
      if (err instanceof Error) {
        if (
          err.message === "Ressource non trouvée" ||
          err.message === "Challenge non trouvé" ||
          err.message === "Événement non trouvé" ||
          err.message === "Fichier non trouvé"
        ) {
          return sendError(res, err.message, 404, "RESOURCE_NOT_FOUND");
        }
        if (err.message === "Non autorisé à accéder à ce challenge") {
          return sendError(res, err.message, 403, "FORBIDDEN_ACCESS");
        }
      }
      return sendError(
        res,
        "Erreur lors du téléchargement de la ressource",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

export default router;
