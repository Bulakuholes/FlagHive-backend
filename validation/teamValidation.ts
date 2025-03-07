import { z } from "zod";

/**
 * Schéma de validation pour la création d'une équipe
 */
export const createTeamSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, "Le nom de l'équipe doit contenir au moins 3 caractères")
      .max(50, "Le nom de l'équipe ne peut pas dépasser 50 caractères")
      .regex(
        /^[a-zA-Z0-9\s_-]+$/,
        "Le nom de l'équipe ne peut contenir que des lettres, chiffres, espaces, tirets et underscores"
      ),
    description: z
      .string()
      .max(500, "La description ne peut pas dépasser 500 caractères")
      .optional(),
    avatar: z
      .string()
      .url("L'URL de l'avatar doit être valide")
      .max(255, "L'URL de l'avatar ne peut pas dépasser 255 caractères")
      .optional()
      .nullable(),
    isPrivate: z.boolean().optional().default(false),
    inviteCode: z
      .string()
      .min(6, "Le code d'invitation doit contenir au moins 6 caractères")
      .max(20, "Le code d'invitation ne peut pas dépasser 20 caractères")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Le code d'invitation ne peut contenir que des lettres, chiffres, tirets et underscores"
      )
      .optional(),
  }),
});

/**
 * Type pour les données de création d'équipe validées
 */
export type CreateTeamInput = z.infer<typeof createTeamSchema>["body"];

/**
 * Schéma de validation pour la mise à jour d'une équipe
 */
export const updateTeamSchema = z.object({
  params: z.object({
    id: z.string().uuid("L'ID de l'équipe doit être un UUID valide"),
  }),
  body: z.object({
    name: z
      .string()
      .min(3, "Le nom de l'équipe doit contenir au moins 3 caractères")
      .max(50, "Le nom de l'équipe ne peut pas dépasser 50 caractères")
      .regex(
        /^[a-zA-Z0-9\s_-]+$/,
        "Le nom de l'équipe ne peut contenir que des lettres, chiffres, espaces, tirets et underscores"
      )
      .optional(),
    description: z
      .string()
      .max(500, "La description ne peut pas dépasser 500 caractères")
      .optional()
      .nullable(),
    avatar: z
      .string()
      .url("L'URL de l'avatar doit être valide")
      .max(255, "L'URL de l'avatar ne peut pas dépasser 255 caractères")
      .optional()
      .nullable(),
    isPrivate: z.boolean().optional(),
    inviteCode: z
      .string()
      .min(6, "Le code d'invitation doit contenir au moins 6 caractères")
      .max(20, "Le code d'invitation ne peut pas dépasser 20 caractères")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Le code d'invitation ne peut contenir que des lettres, chiffres, tirets et underscores"
      )
      .optional()
      .nullable(),
  }),
});

/**
 * Type pour les données de mise à jour d'équipe validées
 */
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>["body"];

/**
 * Schéma de validation pour rejoindre une équipe avec un code d'invitation
 */
export const joinTeamSchema = z.object({
  body: z.object({
    inviteCode: z.string().min(1, "Le code d'invitation est requis"),
  }),
});

/**
 * Type pour les données de rejoindre une équipe validées
 */
export type JoinTeamInput = z.infer<typeof joinTeamSchema>["body"];

/**
 * Schéma de validation pour l'ajout d'un membre à une équipe
 */
export const addTeamMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid("L'ID de l'équipe doit être un UUID valide"),
  }),
  body: z.object({
    userId: z.string().uuid("L'ID de l'utilisateur doit être un UUID valide"),
    role: z
      .enum(["MEMBER", "ADMIN"], {
        errorMap: () => ({ message: "Le rôle doit être MEMBER ou ADMIN" }),
      })
      .optional()
      .default("MEMBER"),
  }),
});

/**
 * Type pour les données d'ajout de membre validées
 */
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>["body"];
