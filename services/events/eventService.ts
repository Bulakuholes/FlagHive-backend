import { prisma } from "../../prisma/client";

/**
 * Récupère tous les événements accessibles par l'utilisateur
 */
export const getEvents = async (userId: string) => {
  // Récupérer les équipes de l'utilisateur
  const userTeams = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });

  const teamIds = userTeams.map((team) => team.teamId);

  // Récupérer les événements liés à ces équipes
  const eventTeams = await prisma.eventTeam.findMany({
    where: {
      teamId: { in: teamIds },
    },
    select: { eventId: true },
  });

  const eventIds = eventTeams.map((et) => et.eventId);

  // Récupérer les événements
  return await prisma.event.findMany({
    where: {
      id: { in: eventIds },
    },
    orderBy: [{ startDate: "desc" }],
  });
};

/**
 * Récupère un événement par son ID
 */
export const getEventById = async (eventId: string, userId: string) => {
  // Récupérer l'événement
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      teams: {
        include: {
          team: true,
        },
      },
      challenges: {
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
      },
    },
  });

  if (!event) {
    throw new Error("Événement non trouvé");
  }

  // Vérifier si l'utilisateur a accès à cet événement via une de ses équipes
  const userTeams = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });

  const teamIds = userTeams.map((team) => team.teamId);

  const hasAccess = event.teams.some((et) => teamIds.includes(et.team.id));

  if (!hasAccess) {
    throw new Error("Non autorisé à accéder à cet événement");
  }

  return event;
};

/**
 * Crée un nouvel événement
 */
export const createEvent = async (
  name: string,
  description: string | undefined,
  startDate: Date,
  endDate: Date,
  website: string | undefined,
  ctfdUrl: string | undefined,
  ctfdApiKey: string | undefined,
  userId: string
) => {
  // Créer l'événement sans association automatique à une équipe
  const event = await prisma.event.create({
    data: {
      name,
      description,
      startDate,
      endDate,
      website,
      ctfdUrl,
      ctfdApiKey,
    },
  });

  return event;
};

/**
 * Ajoute une équipe à un événement
 */
export const addTeamToEvent = async (
  eventId: string,
  teamId: string,
  userId: string
) => {
  // Vérifier si l'événement existe
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Événement non trouvé");
  }

  // Vérifier si l'utilisateur est propriétaire de l'équipe
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new Error("Équipe non trouvée");
  }

  if (team.ownerId !== userId) {
    throw new Error(
      "Vous devez être propriétaire de l'équipe pour l'ajouter à un événement"
    );
  }

  // Vérifier si l'équipe est déjà associée à l'événement
  const existingEventTeam = await prisma.eventTeam.findUnique({
    where: {
      eventId_teamId: {
        eventId,
        teamId,
      },
    },
  });

  if (existingEventTeam) {
    throw new Error("Cette équipe est déjà associée à cet événement");
  }

  // Associer l'équipe à l'événement
  return await prisma.eventTeam.create({
    data: {
      eventId,
      teamId,
    },
  });
};
