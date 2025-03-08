import { UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import express from "express";
import {
  authenticateJWT,
  requireRole,
} from "../../../../middlewares/authMiddleware";
import { validate } from "../../../../middlewares/validationMiddleware";
import { authenticateUser } from "../../../../services/authService";
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
} from "../../../../services/userService";
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
 *                 message:
 *                   type: string
 *                   example: Utilisateur créé avec succès
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
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
        return res
          .status(409)
          .json({ message: "Ce nom d'utilisateur est déjà utilisé" });
      }

      const existingEmail = await findUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "Cet email est déjà utilisé" });
      }

      // Création de l'utilisateur
      const user = await createUser(username, email, password, UserRole.USER);

      // Suppression du mot de passe hashé de la réponse
      const { hashedPassword, ...userWithoutPassword } = user;

      return res.status(201).json({
        message: "Utilisateur créé avec succès",
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      return res.status(500).json({
        message: "Erreur lors de la création de l'utilisateur",
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Connexion d'un utilisateur
 *     description: Authentifie un utilisateur et renvoie un token JWT
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
 *                 message:
 *                   type: string
 *                   example: Connexion réussie
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                 token:
 *                   type: string
 *                   description: Token JWT pour l'authentification
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
      const result = await authenticateUser(username, password);

      if (!result) {
        return res.status(401).json({
          message: "Nom d'utilisateur ou mot de passe incorrect",
        });
      }

      const { user, token } = result;

      // Suppression du mot de passe hashé de la réponse
      const { hashedPassword, ...userWithoutPassword } = user;

      return res.json({
        message: "Connexion réussie",
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      return res.status(500).json({
        message: "Erreur lors de la connexion",
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Profil de l'utilisateur
 *     description: Récupère les informations de l'utilisateur connecté
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations de l'utilisateur récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Non authentifié
 */
/**
 * Route pour obtenir le profil de l'utilisateur connecté
 */
router.get("/me", authenticateJWT, async (req: Request, res: Response) => {
  try {
    return res.json({
      user: req.user,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération du profil",
    });
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
    return res.json({
      message: "Route d'administration accessible",
      user: req.user,
    });
  }
);

export default router;
