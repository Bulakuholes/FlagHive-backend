import { doubleCsrf } from "csrf-csrf";
import express from "express";
import config from "../../config/config";

const router = express.Router();

const csrfConfig = doubleCsrf({
  getSecret: () => config.csrfSecret,
  cookieName: config.csrf.cookieName,
  cookieOptions: config.csrf.cookieOptions,
  size: config.csrf.size,
  ignoredMethods: config.csrf.ignoredMethods,
});

const { generateToken, doubleCsrfProtection } = csrfConfig;

// Route pour obtenir un token CSRF
router.get("/token", (req, res) => {
  res.json({ csrfToken: generateToken(req, res) });
});

// Route pour vérifier un token CSRF (pour les tests)
router.post("/verify", doubleCsrfProtection, (req, res) => {
  res.json({ message: "Token CSRF valide" });
});

export { doubleCsrfProtection, generateToken };
export default router;
