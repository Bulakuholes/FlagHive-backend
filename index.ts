import cookieParser from "cookie-parser";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import config from "./config/config";
import { csrfTokenMiddleware } from "./middleware/csrf";
import { registerRoutes } from "./routes";

const app = express();
const PORT = config.port;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(helmet());

// Configuration du middleware CSRF
app.use(csrfTokenMiddleware);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limite chaque IP à 100 requêtes par fenêtre
  standardHeaders: "draft-7", // Utilise les en-têtes standard RateLimit
  legacyHeaders: false, // Désactive les en-têtes X-RateLimit
  message: "Trop de requêtes, veuillez réessayer plus tard.",
});
app.use(limiter);

registerRoutes(app);

app.get("/", (req, res) => {
  res.json({ message: "Bienvenue sur l'API FlagHive" });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
