import { z } from "zod";

/**
 * Schéma de validation pour la création d'un challenge
 */
export const createChallengeSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, "Le nom du challenge doit contenir au moins 3 caractères")
      .max(100, "Le nom du challenge ne peut pas dépasser 100 caractères"),
    description: z
      .string()
      .max(1000, "La description ne peut pas dépasser 1000 caractères")
      .optional(),
    category: z
      .string()
      .max(50, "La catégorie ne peut pas dépasser 50 caractères")
      .optional(),
    difficulty: z
      .enum(["EASY", "MEDIUM", "HARD", "INSANE"], {
        errorMap: () => ({
          message: "La difficulté doit être EASY, MEDIUM, HARD ou INSANE",
        }),
      })
      .optional(),
    points: z
      .number()
      .int("Les points doivent être un nombre entier")
      .min(0, "Les points ne peuvent pas être négatifs")
      .optional(),
    flag: z
      .string()
      .max(255, "Le flag ne peut pas dépasser 255 caractères")
      .optional(),
    teamId: z.string().uuid("L'ID de l'équipe doit être un UUID valide"),
  }),
});

/**
 * Type pour les données de création de challenge validées
 */
export type CreateChallengeInput = z.infer<
  typeof createChallengeSchema
>["body"];

/**
 * Schéma de validation pour la mise à jour d'un challenge
 */
export const updateChallengeSchema = z.object({
  params: z.object({
    id: z.string().uuid("L'ID du challenge doit être un UUID valide"),
  }),
  body: z.object({
    name: z
      .string()
      .min(3, "Le nom du challenge doit contenir au moins 3 caractères")
      .max(100, "Le nom du challenge ne peut pas dépasser 100 caractères")
      .optional(),
    description: z
      .string()
      .max(1000, "La description ne peut pas dépasser 1000 caractères")
      .optional()
      .nullable(),
    category: z
      .string()
      .max(50, "La catégorie ne peut pas dépasser 50 caractères")
      .optional()
      .nullable(),
    difficulty: z
      .enum(["EASY", "MEDIUM", "HARD", "INSANE"], {
        errorMap: () => ({
          message: "La difficulté doit être EASY, MEDIUM, HARD ou INSANE",
        }),
      })
      .optional()
      .nullable(),
    points: z
      .number()
      .int("Les points doivent être un nombre entier")
      .min(0, "Les points ne peuvent pas être négatifs")
      .optional()
      .nullable(),
    flag: z
      .string()
      .max(255, "Le flag ne peut pas dépasser 255 caractères")
      .optional()
      .nullable(),
  }),
});

/**
 * Type pour les données de mise à jour de challenge validées
 */
export type UpdateChallengeInput = z.infer<
  typeof updateChallengeSchema
>["body"];

/**
 * Schéma de validation pour la résolution d'un challenge
 */
export const solveChallengeSchema = z.object({
  params: z.object({
    id: z.string().uuid("L'ID du challenge doit être un UUID valide"),
  }),
  body: z.object({
    flag: z.string().min(1, "Le flag est requis"),
  }),
});

/**
 * Schéma de validation pour l'ajout d'une note à un challenge
 */
export const addNoteSchema = z.object({
  params: z.object({
    id: z.string().uuid("L'ID du challenge doit être un UUID valide"),
  }),
  body: z.object({
    content: z
      .string()
      .min(1, "Le contenu de la note est requis")
      .max(2000, "Le contenu de la note ne peut pas dépasser 2000 caractères"),
  }),
});

/**
 * Type pour les données d'ajout de note validées
 */
export type AddNoteInput = z.infer<typeof addNoteSchema>["body"];
