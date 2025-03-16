import { prisma } from "../../prisma/client";

/**
 * Ajoute une note à un challenge
 */
export const addNoteToChallenge = async (
  challengeId: string,
  content: string,
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
    throw new Error("Non autorisé à ajouter une note à ce challenge");
  }

  // Créer la note
  return await prisma.note.create({
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
};

/**
 * Récupère toutes les notes d'un challenge
 */
export const getNotesByChallengeId = async (
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
    throw new Error("Non autorisé à accéder aux notes de ce challenge");
  }

  // Récupérer toutes les notes du challenge
  return await prisma.note.findMany({
    where: { challengeId },
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
  });
};

/**
 * Met à jour une note existante
 */
export const updateNoteById = async (
  noteId: string,
  content: string,
  userId: string
) => {
  // Récupérer la note
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: {
      challenge: true,
    },
  });

  if (!note) {
    throw new Error("Note non trouvée");
  }

  // Vérifier si l'utilisateur est l'auteur de la note
  if (note.userId !== userId) {
    // Vérifier si l'utilisateur est administrateur de l'équipe
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: note.challenge.teamId,
        },
      },
    });

    if (!teamMember || teamMember.role !== "ADMIN") {
      throw new Error("Non autorisé à modifier cette note");
    }
  }

  // Mettre à jour la note
  return await prisma.note.update({
    where: { id: noteId },
    data: {
      content,
      updatedAt: new Date(),
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
};

/**
 * Supprime une note existante
 */
export const deleteNoteById = async (noteId: string, userId: string) => {
  // Récupérer la note
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: {
      challenge: true,
    },
  });

  if (!note) {
    throw new Error("Note non trouvée");
  }

  // Vérifier si l'utilisateur est l'auteur de la note
  if (note.userId !== userId) {
    // Vérifier si l'utilisateur est administrateur de l'équipe
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: note.challenge.teamId,
        },
      },
    });

    if (!teamMember || teamMember.role !== "ADMIN") {
      throw new Error("Non autorisé à supprimer cette note");
    }
  }

  // Supprimer la note
  await prisma.note.delete({
    where: { id: noteId },
  });

  return true;
};
