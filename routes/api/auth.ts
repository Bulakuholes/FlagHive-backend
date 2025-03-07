import { UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import express from "express";
import { authenticateJWT, requireRole } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validationMiddleware";
import { authenticateUser } from "../../services/authService";
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
} from "../../services/userService";
import { loginSchema, registerSchema } from "../../validation/authValidation";

// Create router instance
const router = express.Router();

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
