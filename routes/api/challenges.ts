import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validationMiddleware";
import { prisma } from "../../prisma/client";
import {
  addNoteSchema,
  createChallengeSchema,
  solveChallengeSchema,
} from "../../validation/challengeValidation";

const router = express.Router();

/**
 * Crée un nouveau challenge
 */
router.post(
  "/",
  authenticateJWT,
  validate(createChallengeSchema),
  async (req: Request, res: Response) => {
    const { name, description, category, points, teamId, eventId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    if (!name || !teamId) {
      return res.status(400).json({
        message: "Le nom du challenge et l'ID de l'équipe sont requis",
      });
    }

    try {
      // Vérifier si l'utilisateur est membre de l'équipe
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
      });

      if (!teamMember) {
        return res
          .status(403)
          .json({ message: "Vous n'êtes pas membre de cette équipe" });
      }

      // Vérifier si un challenge avec ce nom existe déjà dans l'équipe
      const existingChallenge = await prisma.challenge.findUnique({
        where: {
          name_teamId: {
            name,
            teamId,
          },
        },
      });

      if (existingChallenge) {
        return res.status(409).json({
          message: "Un challenge avec ce nom existe déjà dans cette équipe",
        });
      }

      // Créer le challenge
      const challenge = await prisma.challenge.create({
        data: {
          name,
          description,
          category,
          points: points ? parseInt(points) : undefined,
          teamId,
          eventId,
        },
      });

      // Auto-assigner l'utilisateur au challenge
      await prisma.challengeAssignment.create({
        data: {
          challengeId: challenge.id,
          userId,
        },
      });

      return res.status(201).json({
        message: "Challenge créé avec succès",
        challenge,
      });
    } catch (error) {
      console.error("Erreur lors de la création du challenge:", error);
      return res.status(500).json({
        message: "Erreur lors de la création du challenge",
      });
    }
  }
);

/**
 * Récupère tous les challenges d'une équipe
 */
router.get(
  "/team/:teamId",
  authenticateJWT,
  async (req: Request, res: Response) => {
    const teamId = req.params.teamId;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    try {
      // Vérifier si l'utilisateur est membre de l'équipe
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
      });

      if (!teamMember) {
        return res
          .status(403)
          .json({ message: "Vous n'êtes pas membre de cette équipe" });
      }

      // Récupérer tous les challenges de l'équipe
      const challenges = await prisma.challenge.findMany({
        where: { teamId },
        include: {
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                },
              },
            },
          },
        },
        orderBy: [{ solved: "asc" }, { category: "asc" }, { name: "asc" }],
      });

      return res.json({ challenges });
    } catch (error) {
      console.error("Erreur lors de la récupération des challenges:", error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des challenges",
      });
    }
  }
);

/**
 * Récupère un challenge par son ID
 */
router.get("/:id", authenticateJWT, async (req: Request, res: Response) => {
  const challengeId = req.params.id;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }

  try {
    // Récupérer le challenge avec ses détails
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        notes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        uploads: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!challenge) {
      return res.status(404).json({ message: "Challenge non trouvé" });
    }

    // Vérifier si l'utilisateur est membre de l'équipe du challenge
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: challenge.teamId,
        },
      },
    });

    if (!teamMember) {
      return res
        .status(403)
        .json({ message: "Vous n'avez pas accès à ce challenge" });
    }

    return res.json({ challenge });
  } catch (error) {
    console.error("Erreur lors de la récupération du challenge:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération du challenge",
    });
  }
});

/**
 * S'assigner à un challenge
 */
router.post(
  "/:id/assign",
  authenticateJWT,
  async (req: Request, res: Response) => {
    const challengeId = req.params.id;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    try {
      // Récupérer le challenge
      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
      });

      if (!challenge) {
        return res.status(404).json({ message: "Challenge non trouvé" });
      }

      // Vérifier si l'utilisateur est membre de l'équipe du challenge
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: challenge.teamId,
          },
        },
      });

      if (!teamMember) {
        return res
          .status(403)
          .json({ message: "Vous n'avez pas accès à ce challenge" });
      }

      // Vérifier si l'utilisateur est déjà assigné au challenge
      const existingAssignment = await prisma.challengeAssignment.findUnique({
        where: {
          challengeId_userId: {
            challengeId,
            userId,
          },
        },
      });

      if (existingAssignment) {
        return res
          .status(409)
          .json({ message: "Vous êtes déjà assigné à ce challenge" });
      }

      // Assigner l'utilisateur au challenge
      await prisma.challengeAssignment.create({
        data: {
          challengeId,
          userId,
        },
      });

      return res.json({
        message: "Vous avez été assigné au challenge avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de l'assignation au challenge:", error);
      return res.status(500).json({
        message: "Erreur lors de l'assignation au challenge",
      });
    }
  }
);

/**
 * Marquer un challenge comme résolu
 */
router.post(
  "/:id/solve",
  authenticateJWT,
  validate(solveChallengeSchema),
  async (req: Request, res: Response) => {
    const challengeId = req.params.id;
    const { flag } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    try {
      // Récupérer le challenge
      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
      });

      if (!challenge) {
        return res.status(404).json({ message: "Challenge non trouvé" });
      }

      // Vérifier si l'utilisateur est membre de l'équipe du challenge
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: challenge.teamId,
          },
        },
      });

      if (!teamMember) {
        return res
          .status(403)
          .json({ message: "Vous n'avez pas accès à ce challenge" });
      }

      // Si le challenge a un flag défini, vérifier qu'il correspond
      if (challenge.flag && challenge.flag !== flag) {
        return res.status(400).json({ message: "Flag incorrect" });
      }

      // Marquer le challenge comme résolu
      const updatedChallenge = await prisma.challenge.update({
        where: { id: challengeId },
        data: {
          solved: true,
          solvedAt: new Date(),
        },
      });

      return res.json({
        message: "Challenge marqué comme résolu avec succès",
        challenge: updatedChallenge,
      });
    } catch (error) {
      console.error("Erreur lors de la résolution du challenge:", error);
      return res.status(500).json({
        message: "Erreur lors de la résolution du challenge",
      });
    }
  }
);

/**
 * Ajouter une note à un challenge
 */
router.post(
  "/:id/notes",
  authenticateJWT,
  validate(addNoteSchema),
  async (req: Request, res: Response) => {
    const challengeId = req.params.id;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    if (!content) {
      return res
        .status(400)
        .json({ message: "Le contenu de la note est requis" });
    }

    try {
      // Récupérer le challenge
      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
      });

      if (!challenge) {
        return res.status(404).json({ message: "Challenge non trouvé" });
      }

      // Vérifier si l'utilisateur est membre de l'équipe du challenge
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: challenge.teamId,
          },
        },
      });

      if (!teamMember) {
        return res
          .status(403)
          .json({ message: "Vous n'avez pas accès à ce challenge" });
      }

      // Créer la note
      const note = await prisma.note.create({
        data: {
          content,
          challengeId,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      return res.status(201).json({
        message: "Note ajoutée avec succès",
        note,
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout de la note:", error);
      return res.status(500).json({
        message: "Erreur lors de l'ajout de la note",
      });
    }
  }
);

export default router;
