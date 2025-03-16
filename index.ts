import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import config from "./config/config";
import { csrfTokenMiddleware } from "./middleware/csrf";
import { registerRoutes } from "./routes";
import { info } from "./utils/logger";
import httpLogger from "./utils/logger/httpLogger";

const app = express();
const PORT = config.port;

app.use(httpLogger);

const corsOptions = {
  origin: config.corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
};

info(`Origines CORS autorisées: ${config.corsOrigins.join(", ")}`);

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(helmet());

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
  info(`Serveur démarré sur http://localhost:${PORT}`);
});
