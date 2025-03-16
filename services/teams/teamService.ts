import crypto from "crypto";
import { prisma } from "../../prisma/client";

/**
 * Génère un code d'invitation unique
 */
export const generateInviteCode = (): string => {
  return crypto.randomBytes(6).toString("hex");
};

/**
 * Crée une nouvelle équipe
 */
export const createTeam = async (
  name: string,
  description: string | undefined,
  userId: string
) => {
  // Vérification si une équipe avec ce nom existe déjà
  const existingTeam = await prisma.team.findUnique({
    where: { name },
  });

  if (existingTeam) {
    throw new Error("Ce nom d'équipe est déjà utilisé");
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

  return team;
};

/**
 * Récupère toutes les équipes d'un utilisateur
 */
export const getUserTeams = async (userId: string) => {
  // Récupérer toutes les équipes dont l'utilisateur est membre
  const teamMembers = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: true,
    },
  });

  return teamMembers.map((member) => ({
    ...member.team,
    role: member.role,
  }));
};

/**
 * Récupère une équipe par son ID
 */
export const getTeamById = async (teamId: string, userId: string) => {
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
    throw new Error("Accès non autorisé à cette équipe");
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
    throw new Error("Équipe non trouvée");
  }

  return team;
};

/**
 * Rejoint une équipe avec un code d'invitation
 */
export const joinTeamWithInviteCode = async (
  inviteCode: string,
  userId: string
) => {
  // Trouver l'équipe correspondant au code d'invitation
  const team = await prisma.team.findUnique({
    where: { inviteCode },
  });

  if (!team) {
    throw new Error("Code d'invitation invalide");
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
    throw new Error("Vous êtes déjà membre de cette équipe");
  }

  // Ajouter l'utilisateur comme membre de l'équipe
  await prisma.teamMember.create({
    data: {
      userId,
      teamId: team.id,
      role: "MEMBER",
    },
  });

  return team;
};

/**
 * Crée une nouvelle équipe et l'associe à un événement
 */
export const createTeamForEvent = async (
  name: string,
  description: string | undefined,
  avatar: string | undefined,
  userId: string,
  eventId: string
) => {
  // Vérifier si l'événement existe
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Événement non trouvé");
  }

  // Vérification si une équipe avec ce nom existe déjà
  const existingTeam = await prisma.team.findUnique({
    where: { name },
  });

  if (existingTeam) {
    throw new Error("Une équipe avec ce nom existe déjà");
  }

  // Création de l'équipe avec l'utilisateur comme propriétaire
  const team = await prisma.team.create({
    data: {
      name,
      description,
      avatar,
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

  // Associer l'équipe à l'événement
  const eventTeam = await prisma.eventTeam.create({
    data: {
      eventId,
      teamId: team.id,
    },
  });

  return { team, eventTeam };
};
