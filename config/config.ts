import type { RequestMethod } from "csrf-csrf";
import dotenv from "dotenv";
import { resolve } from "path";

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

const config: Config = {
  port: parseInt(process.env.PORT || "3001"),
  nodeEnv: process.env.NODE_ENV || "development",
  csrfSecret: process.env.CSRF_SECRET || "secret-key-should-be-in-env-coward",
  jwtSecret:
    process.env.JWT_SECRET || "your-secret-key-should-be-in-env-coward",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:3000", "http://localhost:5173"],
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

// Vérification des variables d'environnement requises en production
if (config.nodeEnv === "production") {
  const requiredEnvVars = ["CSRF_SECRET", "JWT_SECRET"];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes en production: ${missingEnvVars.join(
        ", "
      )}`
    );
  }
}

export default config;
