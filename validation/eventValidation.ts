import { z } from "zod";

/**
 * Schéma de validation pour la création d'un événement
 */
export const createEventSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "La date de début doit être une date valide",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "La date de fin doit être une date valide",
  }),
  website: z.string().url().optional(),
  ctfdUrl: z.string().url().optional(),
  ctfdApiKey: z.string().optional(),
});

/**
 * Schéma de validation pour l'ajout d'une équipe à un événement
 */
export const addTeamToEventSchema = z.object({
  teamId: z.string().uuid("L'ID de l'équipe doit être un UUID valide"),
});
