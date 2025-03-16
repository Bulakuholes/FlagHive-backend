import type { RequestMethod } from "csrf-csrf";
import dotenv from "dotenv";
import { resolve } from "path";
import { logError } from "../utils/logger";

dotenv.config({ path: resolve(__dirname, "../.env") });

interface CsrfConfig {
  cookieName: string;
  cookieOptions: {
    httpOnly: boolean;
    sameSite: "strict" | "lax" | "none";
    secure: boolean;
  };
  size: number;
  ignoredMethods: RequestMethod[];
}

interface Config {
  port: number;
  nodeEnv: string;
  csrfSecret: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
  csrf: CsrfConfig;
  database: {
    url: string;
  };
}

// Liste des variables d'environnement requises
const requiredEnvVars = [
  "CSRF_SECRET",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "DATABASE_URL",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  const errorMessage = `Variables d'environnement manquantes: ${missingEnvVars.join(", ")}`;
  if (process.env.NODE_ENV === "production") {
    throw new Error(errorMessage);
  } else {
    logError(new Error(errorMessage), "Config");
    console.warn("\x1b[33m%s\x1b[0m", "⚠️ ATTENTION: " + errorMessage);
    console.warn(
      "\x1b[33m%s\x1b[0m",
      "⚠️ Des valeurs par défaut seront utilisées, mais cela n'est pas recommandé."
    );
  }
}

const backendPort = parseInt(process.env.PORT || "3000");

const generateCorsOrigins = (): string[] => {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(",");
  }

  const commonFrontendPorts = [3000, 5173];

  const frontendPorts = commonFrontendPorts.filter(
    (port) => port !== backendPort
  );

  if (backendPort === 3000 && !frontendPorts.includes(8080)) {
    frontendPorts.push(8080);
  }

  return frontendPorts.map((port) => `http://localhost:${port}`);
};

const config: Config = {
  port: backendPort,
  nodeEnv: process.env.NODE_ENV || "development",
  csrfSecret: process.env.CSRF_SECRET || "secret-key-should-be-in-env-coward",
  jwtSecret:
    process.env.JWT_SECRET || "your-secret-key-should-be-in-env-coward",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  corsOrigins: generateCorsOrigins(),
  csrf: {
    cookieName: process.env.CSRF_COOKIE_NAME || "x-csrf-token",
    cookieOptions: {
      httpOnly: true,
      sameSite: "strict",
      secure: (process.env.NODE_ENV || "development") === "production",
    },
    size: parseInt(process.env.CSRF_TOKEN_SIZE || "64"),
    ignoredMethods: ["GET", "HEAD", "OPTIONS"] as RequestMethod[],
  },
  database: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/flaghive",
  },
};

export default config;
