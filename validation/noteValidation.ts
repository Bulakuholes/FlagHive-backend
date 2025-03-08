import { z } from "zod";

/**
 * Schéma de validation pour l'ajout d'une note
 */
export const addNoteSchema = z.object({
  body: z.object({
    content: z
      .string()
      .min(1, "Le contenu de la note est requis")
      .max(1000, "Le contenu de la note ne peut pas dépasser 1000 caractères"),
  }),
});
