import { prisma } from "../../prisma/client";
import type { ApiResponse } from "../../utils/responseHandler";

/**
 * Crée une nouvelle tentative de flag
 */
export const createFlagAttempt = async (
  flagValue: string,
  isSuccess: boolean,
  comment: string | undefined,
  userId: string,
  challengeId: string
): Promise<ApiResponse> => {
  try {
    // Vérifier si le challenge existe
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return {
        success: false,
        message: "Challenge non trouvé",
        error: {
          code: "NOT_FOUND",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
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
      return {
        success: false,
        message: "Non autorisé à soumettre un flag pour ce challenge",
        error: {
          code: "UNAUTHORIZED",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Créer la tentative de flag
    const flagAttempt = await prisma.flagAttempt.create({
      data: {
        flagValue,
        isSuccess,
        comment,
        userId,
        challengeId,
      },
    });

    return {
      success: true,
      message: "Tentative de flag créée avec succès",
      data: flagAttempt,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Erreur lors de la création de la tentative de flag",
      error: {
        code: "SERVER_ERROR",
        details: error,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
};

/**
 * Récupère toutes les tentatives de flag pour un challenge
 */
export const getFlagAttemptsByChallenge = async (
  challengeId: string,
  userId: string
): Promise<ApiResponse> => {
  try {
    // Vérifier si le challenge existe
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        team: true,
      },
    });

    if (!challenge) {
      return {
        success: false,
        message: "Challenge non trouvé",
        error: {
          code: "NOT_FOUND",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
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
      return {
        success: false,
        message: "Non autorisé à voir les tentatives pour ce challenge",
        error: {
          code: "UNAUTHORIZED",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Récupérer toutes les tentatives pour ce challenge
    const flagAttempts = await prisma.flagAttempt.findMany({
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

    return {
      success: true,
      message: "Tentatives de flag récupérées avec succès",
      data: flagAttempts,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Erreur lors de la récupération des tentatives de flag",
      error: {
        code: "SERVER_ERROR",
        details: error,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
};

/**
 * Récupère une tentative de flag par son ID
 */
export const getFlagAttemptById = async (
  flagAttemptId: string,
  userId: string
): Promise<ApiResponse> => {
  try {
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
      return {
        success: false,
        message: "Tentative de flag non trouvée",
        error: {
          code: "NOT_FOUND",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
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
      return {
        success: false,
        message: "Non autorisé à voir cette tentative",
        error: {
          code: "UNAUTHORIZED",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      success: true,
      message: "Tentative de flag récupérée avec succès",
      data: flagAttempt,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Erreur lors de la récupération de la tentative de flag",
      error: {
        code: "SERVER_ERROR",
        details: error,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
};

/**
 * Ajoute un commentaire à une tentative de flag existante
 */
export const addCommentToFlagAttempt = async (
  flagAttemptId: string,
  comment: string,
  userId: string
): Promise<ApiResponse> => {
  try {
    // Récupérer la tentative
    const flagAttempt = await prisma.flagAttempt.findUnique({
      where: { id: flagAttemptId },
      include: {
        challenge: true,
      },
    });

    if (!flagAttempt) {
      return {
        success: false,
        message: "Tentative de flag non trouvée",
        error: {
          code: "NOT_FOUND",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
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
      return {
        success: false,
        message: "Non autorisé à modifier cette tentative",
        error: {
          code: "UNAUTHORIZED",
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Mettre à jour le commentaire
    const updatedFlagAttempt = await prisma.flagAttempt.update({
      where: { id: flagAttemptId },
      data: { comment },
    });

    return {
      success: true,
      message: "Commentaire ajouté avec succès",
      data: updatedFlagAttempt,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Erreur lors de l'ajout du commentaire",
      error: {
        code: "SERVER_ERROR",
        details: error,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
};
