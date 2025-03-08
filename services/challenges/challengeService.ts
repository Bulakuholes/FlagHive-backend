import { prisma } from "../../prisma/client";

/**
 * Crée un nouveau challenge
 */
export const createChallenge = async (
  name: string,
  description: string | undefined,
  category: string | undefined,
  points: string | undefined,
  teamId: string,
  eventId: string | undefined,
  userId: string
) => {
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
    throw new Error("Un challenge avec ce nom existe déjà dans cette équipe");
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
 * Récupère tous les challenges d'une équipe
 */
export const getChallengesByTeamId = async (teamId: string, userId: string) => {
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

  // Récupérer tous les challenges de l'équipe
  return await prisma.challenge.findMany({
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
};

/**
 * Récupère un challenge par son ID
 */
export const getChallengeById = async (challengeId: string, userId: string) => {
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
    throw new Error("Vous n'avez pas accès à ce challenge");
  }

  return challenge;
};

/**
 * Assigne un utilisateur à un challenge
 */
export const assignUserToChallenge = async (
  challengeId: string,
  userId: string
) => {
  // Récupérer le challenge
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
    throw new Error("Vous n'avez pas accès à ce challenge");
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
    throw new Error("Vous êtes déjà assigné à ce challenge");
  }

  // Assigner l'utilisateur au challenge
  return await prisma.challengeAssignment.create({
    data: {
      challengeId,
      userId,
    },
  });
};

/**
 * Marque un challenge comme résolu
 */
export const solveChallenge = async (
  challengeId: string,
  flag: string,
  userId: string
) => {
  // Récupérer le challenge
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
    throw new Error("Vous n'avez pas accès à ce challenge");
  }

  // Si le challenge a un flag défini, vérifier qu'il correspond
  if (challenge.flag && challenge.flag !== flag) {
    throw new Error("Flag incorrect");
  }

  // Marquer le challenge comme résolu
  return await prisma.challenge.update({
    where: { id: challengeId },
    data: {
      solved: true,
      solvedAt: new Date(),
    },
  });
};
