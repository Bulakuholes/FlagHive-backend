import { PrismaClient } from "@prisma/client";
import config from "../config/config";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: config.database.url,
      },
    },
    log:
      config.nodeEnv === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (config.nodeEnv === "development") globalForPrisma.prisma = prisma;

export default prisma;
