import { UserRole } from "@prisma/client";
import crypto from "crypto";
import type { Request, Response } from "express";
import express from "express";
import {
  authenticateJWT,
  requireRole,
} from "../../../../middlewares/authMiddleware";
import { validate } from "../../../../middlewares/validationMiddleware";
import {
  authenticateUser,
  clearJWTCookie,
} from "../../../../services/authService";
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
} from "../../../../services/userService";
import { logError } from "../../../../utils/logger";
import { sendError, sendSuccess } from "../../../../utils/responseHandler";
import {
  loginSchema,
  registerSchema,
} from "../../../../validation/authValidation";

// Create router instance
const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     description: Crée un nouveau compte utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nom d'utilisateur
 *                 example: testuser
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Adresse email
 *                 example: test@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe (min 8 caractères)
 *                 example: Password123!
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Utilisateur créé avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         gravatarHash:
 *                           type: string
 *                           description: Hash SHA-256 de l'email pour Gravatar
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Données d'entrée invalides
 *       409:
 *         description: Nom d'utilisateur ou email déjà utilisé
 */
/**
 * Route d'inscription
 */
router.post(
  "/register",
  validate(registerSchema),
  async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    try {
      // Vérification si l'utilisateur existe déjà
      const existingUser = await findUserByUsername(username);
      if (existingUser) {
        return sendError(
          res,
          "Ce nom d'utilisateur est déjà utilisé",
          409,
          "USERNAME_TAKEN"
        );
      }

      const existingEmail = await findUserByEmail(email);
      if (existingEmail) {
        return sendError(res, "Cet email est déjà utilisé", 409, "EMAIL_TAKEN");
      }

      // Création de l'utilisateur
      const user = await createUser(username, email, password, UserRole.USER);

      // Suppression du mot de passe hashé de la réponse
      const { hashedPassword, ...userWithoutPassword } = user;

      const userWithGravatar = {
        ...userWithoutPassword,
        gravatarHash: getGravatarHash(email),
      };

      return sendSuccess(
        res,
        "Utilisateur créé avec succès",
        { user: userWithGravatar },
        201
      );
    } catch (error) {
      logError(
        error instanceof Error ? error : new Error(String(error)),
        "Erreur lors de l'inscription"
      );
      return sendError(
        res,
        "Erreur lors de la création de l'utilisateur",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Connexion d'un utilisateur
 *     description: Authentifie un utilisateur et définit un cookie JWT
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nom d'utilisateur
 *                 example: testuser
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Connexion réussie
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         gravatarHash:
 *                           type: string
 *                           description: Hash SHA-256 de l'email pour Gravatar
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Données d'entrée invalides
 *       401:
 *         description: Nom d'utilisateur ou mot de passe incorrect
 */
/**
 * Route de connexion
 */
router.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
      // Authentification de l'utilisateur
      const result = await authenticateUser(username, password, res);

      if (!result) {
        return sendError(
          res,
          "Nom d'utilisateur ou mot de passe incorrect",
          401,
          "INVALID_CREDENTIALS"
        );
      }

      const { user } = result;

      const userWithGravatar = {
        ...user,
        gravatarHash: getGravatarHash(user.email),
      };

      return sendSuccess(res, "Connexion réussie", { user: userWithGravatar });
    } catch (error) {
      logError(
        error instanceof Error ? error : new Error(String(error)),
        "Erreur lors de la connexion"
      );
      return sendError(
        res,
        "Erreur lors de l'authentification",
        500,
        "SERVER_ERROR"
      );
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Déconnexion de l'utilisateur
 *     description: Supprime le cookie JWT
 *     tags: [Authentification]
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Déconnexion réussie
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.post("/logout", (req: Request, res: Response) => {
  // Supprimer le cookie JWT
  clearJWTCookie(res);
  return sendSuccess(res, "Déconnexion réussie");
});

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Profil de l'utilisateur connecté
 *     description: Récupère les informations de l'utilisateur connecté
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profil récupéré avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         gravatarHash:
 *                           type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Non authentifié
 */
/**
 * Génère un hash SHA-256 pour Gravatar
 */
const getGravatarHash = (email: string): string => {
  return crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
};

router.get("/me", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return sendError(
        res,
        "Utilisateur non authentifié",
        401,
        "NOT_AUTHENTICATED"
      );
    }

    const userWithGravatar = {
      ...user,
      gravatarHash: getGravatarHash(user.email),
    };

    return sendSuccess(res, "Profil récupéré avec succès", {
      user: userWithGravatar,
    });
  } catch (error) {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      "Erreur lors de la récupération du profil"
    );
    return sendError(
      res,
      "Erreur lors de la récupération du profil",
      500,
      "SERVER_ERROR"
    );
  }
});

/**
 * Route protégée par JWT accessible uniquement aux administrateurs
 */
router.get(
  "/admin",
  authenticateJWT,
  requireRole(["ADMIN"]),
  async (req: Request, res: Response) => {
    return sendSuccess(res, "Route d'administration accessible", {
      user: req.user,
    });
  }
);

export default router;
