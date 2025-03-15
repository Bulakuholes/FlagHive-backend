import { z } from "zod";

/**
 * Schéma de validation pour l'ajout d'une ressource
 */
export const addResourceSchema = z.object({
  description: z.string().optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z
    .enum(["team", "challenge", "public"])
    .optional()
    .default("team"),
});

/**
 * Schéma de validation pour la mise à jour d'une ressource
 */
export const updateResourceSchema = z.object({
  description: z.string().optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(["team", "challenge", "public"]).optional(),
});
