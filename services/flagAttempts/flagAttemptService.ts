import { prisma } from "../../prisma/client";

/**
 * Crée une nouvelle tentative de flag
 */
export const createFlagAttempt = async (
  flagValue: string,
  isSuccess: boolean,
  comment: string | undefined,
  userId: string,
  challengeId: string
) => {
  // Vérifier si le challenge existe
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    throw new Error("Challenge non trouvé");
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
    throw new Error("Non autorisé à soumettre un flag pour ce challenge");
  }

  // Créer la tentative de flag
  return await prisma.flagAttempt.create({
    data: {
      flagValue,
      isSuccess,
      comment,
      userId,
      challengeId,
    },
  });
};

/**
 * Récupère toutes les tentatives de flag pour un challenge
 */
export const getFlagAttemptsByChallenge = async (
  challengeId: string,
  userId: string
) => {
  // Vérifier si le challenge existe
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      team: true,
    },
  });

  if (!challenge) {
    throw new Error("Challenge non trouvé");
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
    throw new Error("Non autorisé à voir les tentatives pour ce challenge");
  }

  // Récupérer toutes les tentatives pour ce challenge
  return await prisma.flagAttempt.findMany({
    where: {
      challengeId,
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
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Récupère une tentative de flag par son ID
 */
export const getFlagAttemptById = async (
  flagAttemptId: string,
  userId: string
) => {
  // Récupérer la tentative avec ses détails
  const flagAttempt = await prisma.flagAttempt.findUnique({
    where: { id: flagAttemptId },
    include: {
      challenge: {
        include: {
          team: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  if (!flagAttempt) {
    throw new Error("Tentative de flag non trouvée");
  }

  // Vérifier si l'utilisateur est membre de l'équipe du challenge
  const teamMember = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId: flagAttempt.challenge.teamId,
      },
    },
  });

  if (!teamMember) {
    throw new Error("Non autorisé à voir cette tentative");
  }

  return flagAttempt;
};

/**
 * Ajoute un commentaire à une tentative de flag existante
 */
export const addCommentToFlagAttempt = async (
  flagAttemptId: string,
  comment: string,
  userId: string
) => {
  // Récupérer la tentative
  const flagAttempt = await prisma.flagAttempt.findUnique({
    where: { id: flagAttemptId },
    include: {
      challenge: true,
    },
  });

  if (!flagAttempt) {
    throw new Error("Tentative de flag non trouvée");
  }

  // Vérifier si l'utilisateur est membre de l'équipe du challenge
  const teamMember = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId: flagAttempt.challenge.teamId,
      },
    },
  });

  if (!teamMember) {
    throw new Error("Non autorisé à modifier cette tentative");
  }

  // Mettre à jour le commentaire
  return await prisma.flagAttempt.update({
    where: { id: flagAttemptId },
    data: { comment },
  });
};
