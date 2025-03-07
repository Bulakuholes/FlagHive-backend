import crypto from "crypto";
import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT } from "../../middlewares/authMiddleware";
import { prisma } from "../../prisma/client";

const router = express.Router();

/**
 * Génère un code d'invitation unique
 */
const generateInviteCode = (): string => {
  return crypto.randomBytes(6).toString("hex");
};

/**
 * Crée une nouvelle équipe
 */
router.post("/", authenticateJWT, async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }

  if (!name) {
    return res.status(400).json({ message: "Le nom de l'équipe est requis" });
  }

  try {
    // Vérification si une équipe avec ce nom existe déjà
    const existingTeam = await prisma.team.findUnique({
      where: { name },
    });

    if (existingTeam) {
      return res
        .status(409)
        .json({ message: "Ce nom d'équipe est déjà utilisé" });
    }

    // Création de l'équipe avec l'utilisateur comme propriétaire
    const team = await prisma.team.create({
      data: {
        name,
        description,
        inviteCode: generateInviteCode(),
        ownerId: userId,
      },
    });

    // Ajouter l'utilisateur comme membre de l'équipe avec le rôle OWNER
    await prisma.teamMember.create({
      data: {
        userId,
        teamId: team.id,
        role: "OWNER",
      },
    });

    return res.status(201).json({
      message: "Équipe créée avec succès",
      team,
    });
  } catch (error) {
    console.error("Erreur lors de la création de l'équipe:", error);
    return res.status(500).json({
      message: "Erreur lors de la création de l'équipe",
    });
  }
});

/**
 * Récupère toutes les équipes de l'utilisateur
 */
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }

  try {
    // Récupérer toutes les équipes dont l'utilisateur est membre
    const teamMembers = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: true,
      },
    });

    const teams = teamMembers.map((member) => ({
      ...member.team,
      role: member.role,
    }));

    return res.json({ teams });
  } catch (error) {
    console.error("Erreur lors de la récupération des équipes:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des équipes",
    });
  }
});

/**
 * Récupère une équipe par son ID
 */
router.get("/:id", authenticateJWT, async (req: Request, res: Response) => {
  const teamId = req.params.id;
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
        .json({ message: "Accès non autorisé à cette équipe" });
    }

    // Récupérer l'équipe avec ses membres
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée" });
    }

    return res.json({ team });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'équipe:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération de l'équipe",
    });
  }
});

/**
 * Rejoindre une équipe avec un code d'invitation
 */
router.post("/join", authenticateJWT, async (req: Request, res: Response) => {
  const { inviteCode } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }

  if (!inviteCode) {
    return res.status(400).json({ message: "Le code d'invitation est requis" });
  }

  try {
    // Trouver l'équipe correspondant au code d'invitation
    const team = await prisma.team.findUnique({
      where: { inviteCode },
    });

    if (!team) {
      return res.status(404).json({ message: "Code d'invitation invalide" });
    }

    // Vérifier si l'utilisateur est déjà membre de l'équipe
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: team.id,
        },
      },
    });

    if (existingMember) {
      return res
        .status(409)
        .json({ message: "Vous êtes déjà membre de cette équipe" });
    }

    // Ajouter l'utilisateur comme membre de l'équipe
    await prisma.teamMember.create({
      data: {
        userId,
        teamId: team.id,
        role: "MEMBER",
      },
    });

    return res.json({
      message: "Vous avez rejoint l'équipe avec succès",
      team,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout à l'équipe:", error);
    return res.status(500).json({
      message: "Erreur lors de l'ajout à l'équipe",
    });
  }
});

export default router;
