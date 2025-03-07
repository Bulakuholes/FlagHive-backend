import { z } from "zod";

/**
 * Schéma de validation pour l'enregistrement d'un utilisateur
 *
 * Règles :
 * - username : 3-30 caractères, lettres, chiffres, tirets et underscores uniquement
 * - email : format email valide
 * - password :
 *   - au moins 12 caractères
 *   - au moins 1 lettre majuscule
 *   - au moins 1 lettre minuscule
 *   - au moins 1 chiffre
 *   - au moins 1 caractère spécial
 */
export const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
      .max(30, "Le nom d'utilisateur ne peut pas dépasser 30 caractères")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores"
      ),
    email: z
      .string()
      .email("Format d'email invalide")
      .max(255, "L'email ne peut pas dépasser 255 caractères"),
    password: z
      .string()
      .min(12, "Le mot de passe doit contenir au moins 12 caractères")
      .max(60, "Le mot de passe ne peut pas dépasser 60 caractères")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/,
        "Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial"
      ),
  }),
});

/**
 * Type pour les données d'enregistrement validées
 */
export type RegisterInput = z.infer<typeof registerSchema>["body"];

/**
 * Schéma de validation pour la connexion d'un utilisateur
 */
export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, "Le nom d'utilisateur est requis"),
    password: z.string().min(1, "Le mot de passe est requis"),
  }),
});

/**
 * Type pour les données de connexion validées
 */
export type LoginInput = z.infer<typeof loginSchema>["body"];

/**
 * Schéma de validation pour la mise à jour du profil utilisateur
 */
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
    .max(30, "Le nom d'utilisateur ne peut pas dépasser 30 caractères")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores"
    )
    .optional(),
  email: z
    .string()
    .email("Format d'email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères")
    .optional(),
  bio: z
    .string()
    .max(500, "La bio ne peut pas dépasser 500 caractères")
    .optional()
    .nullable(),
  avatar: z
    .string()
    .url("L'URL de l'avatar doit être valide")
    .max(255, "L'URL de l'avatar ne peut pas dépasser 255 caractères")
    .optional()
    .nullable(),
});

/**
 * Type pour les données de mise à jour du profil validées
 */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Schéma de validation pour le changement de mot de passe
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(12, "Le mot de passe actuel est requis"),
    newPassword: z
      .string()
      .min(12, "Le nouveau mot de passe doit contenir au moins 12 caractères")
      .max(60, "Le nouveau mot de passe ne peut pas dépasser 60 caractères")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/,
        "Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial"
      ),
    confirmPassword: z
      .string()
      .min(1, "La confirmation du mot de passe est requise"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

/**
 * Type pour les données de changement de mot de passe validées
 */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
