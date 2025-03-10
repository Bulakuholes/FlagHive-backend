import { prisma } from "../../prisma/client";
import { createFlagAttempt } from "../flagAttempts/flagAttemptService";

/**
 * Crée un nouveau challenge
 */
export const createChallenge = async (
  name: string,
  description: string | undefined,
  category: string | undefined,
  points: string | undefined,
  teamId: string,
  eventId: string,
  userId: string
) => {
  // Vérifier si l'événement existe
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Événement non trouvé");
  }

  // Vérifier si l'équipe est associée à l'événement
  const eventTeam = await prisma.eventTeam.findUnique({
    where: {
      eventId_teamId: {
        eventId,
        teamId,
      },
    },
  });

  if (!eventTeam) {
    throw new Error("Cette équipe n'est pas associée à cet événement");
  }

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
    throw new Error("Vous n'êtes pas membre de cette équipe");
  }

  // Vérifier si un challenge avec ce nom existe déjà pour cet événement et cette équipe
  const existingChallenge = await prisma.challenge.findUnique({
    where: {
      name_teamId_eventId: {
        name,
        teamId,
        eventId,
      },
    },
  });

  if (existingChallenge) {
    throw new Error(
      "Un challenge avec ce nom existe déjà pour cet événement et cette équipe"
    );
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

  return challenge;
};

/**
 * Récupère tous les challenges d'un événement pour un utilisateur
 */
export const getChallengesByEventId = async (
  eventId: string,
  userId: string
) => {
  // Vérifier si l'événement existe
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Événement non trouvé");
  }

  // Récupérer les équipes de l'utilisateur
  const userTeams = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });

  const teamIds = userTeams.map((team) => team.teamId);

  // Vérifier si l'utilisateur a accès à cet événement via une de ses équipes
  const eventTeams = await prisma.eventTeam.findMany({
    where: {
      eventId,
      teamId: { in: teamIds },
    },
  });

  if (eventTeams.length === 0) {
    throw new Error("Non autorisé à accéder à cet événement");
  }

  // Récupérer tous les challenges de l'événement pour les équipes de l'utilisateur
  return await prisma.challenge.findMany({
    where: {
      eventId,
      teamId: { in: teamIds },
    },
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
};

/**
 * Récupère un challenge par son ID
 */
export const getChallengeById = async (
  challengeId: string,
  eventId: string,
  userId: string
) => {
  // Vérifier si l'événement existe
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Événement non trouvé");
  }

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
    throw new Error("Challenge non trouvé");
  }

  // Vérifier si le challenge appartient à l'événement spécifié
  if (challenge.eventId !== eventId) {
    throw new Error("Challenge non trouvé dans cet événement");
  }

  // Vérifier si l'utilisateur a accès à ce challenge
  const userTeams = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });

  const teamIds = userTeams.map((team) => team.teamId);

  if (!teamIds.includes(challenge.teamId)) {
    throw new Error("Non autorisé à accéder à ce challenge");
  }

  return challenge;
};

/**
 * Assigne un utilisateur à un challenge
 */
export const assignUserToChallenge = async (
  challengeId: string,
  targetUserId: string,
  userId: string
) => {
  // Récupérer le challenge
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    throw new Error("Challenge non trouvé");
  }

  // Vérifier si l'utilisateur cible existe
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new Error("Utilisateur non trouvé");
  }

  // Vérifier si l'utilisateur cible est membre de l'équipe du challenge
  const targetTeamMember = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId: targetUserId,
        teamId: challenge.teamId,
      },
    },
  });

  if (!targetTeamMember) {
    throw new Error(
      "L'utilisateur cible n'est pas membre de l'équipe du challenge"
    );
  }

  // Vérifier si l'utilisateur qui fait la demande est membre de l'équipe du challenge
  const userTeamMember = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId: challenge.teamId,
      },
    },
  });

  if (!userTeamMember) {
    throw new Error("Non autorisé à assigner un utilisateur à ce challenge");
  }

  // Vérifier si l'utilisateur cible est déjà assigné au challenge
  const existingAssignment = await prisma.challengeAssignment.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId: targetUserId,
      },
    },
  });

  if (existingAssignment) {
    throw new Error("Cet utilisateur est déjà assigné à ce challenge");
  }

  // Assigner l'utilisateur au challenge
  return await prisma.challengeAssignment.create({
    data: {
      challengeId,
      userId: targetUserId,
    },
  });
};

/**
 * Marque un challenge comme résolu
 */
export const solveChallenge = async (
  challengeId: string,
  eventId: string,
  userId: string,
  flag: string
) => {
  // Vérifier si l'événement existe
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Événement non trouvé");
  }

  // Récupérer le challenge
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    throw new Error("Challenge non trouvé");
  }

  // Vérifier si le challenge appartient à l'événement spécifié
  if (challenge.eventId !== eventId) {
    throw new Error("Challenge non trouvé dans cet événement");
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
    throw new Error("Non autorisé à résoudre ce challenge");
  }

  // Vérifier si le challenge est déjà résolu
  if (challenge.solved) {
    throw new Error("Challenge déjà résolu");
  }

  // Vérifier le flag
  const isSuccess = challenge.flag === flag;
  
  // Enregistrer la tentative de flag
  await createFlagAttempt(
    flag,
    isSuccess,
    isSuccess ? "Tentative réussie" : "Tentative échouée",
    userId,
    challengeId
  );

  if (!isSuccess) {
    return { solved: false };
  }

  // Marquer le challenge comme résolu
  await prisma.challenge.update({
    where: { id: challengeId },
    data: { solved: true, solvedAt: new Date() },
  });

  return { solved: true, points: challenge.points || 0 };
};
