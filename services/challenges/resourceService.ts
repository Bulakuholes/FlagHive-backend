import type { Upload } from "@prisma/client";
import Bun from "bun";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../../prisma/client";

// Étendre le type Upload pour inclure le champ metadata
type UploadWithMetadata = Upload & {
  metadata?: Record<string, any>;
};

/**
 * Type pour les métadonnées des ressources
 */
export type ResourceMetadata = {
  description?: string;
  type?: string;
  tags?: string[];
  visibility?: "team" | "challenge" | "public";
};

/**
 * Type pour les fichiers uploadés
 */
type FileUpload = {
  name?: string;
  size: number;
  type?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

/**
 * Vérifie si l'utilisateur a accès au challenge
 */
const checkChallengeAccess = async (
  challengeId: string,
  eventId: string,
  userId: string
) => {
  // Vérifier si l'événement existe
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Événement non trouvé");
  }

  // Vérifier si le challenge existe
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    throw new Error("Challenge non trouvé");
  }

  // Vérifier si le challenge appartient à l'événement
  if (challenge.eventId !== eventId) {
    throw new Error("Le challenge n'appartient pas à cet événement");
  }

  // Récupérer les équipes de l'utilisateur
  const userTeams = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });

  const teamIds = userTeams.map((team) => team.teamId);

  // Vérifier si l'utilisateur a accès à ce challenge via son équipe
  if (!teamIds.includes(challenge.teamId)) {
    throw new Error("Non autorisé à accéder à ce challenge");
  }

  return challenge;
};

/**
 * Crée le dossier pour stocker les ressources si nécessaire
 */
const ensureUploadDir = (challengeId: string): string => {
  const uploadDir = path.join(
    process.cwd(),
    "uploads",
    "challenges",
    challengeId
  );

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return uploadDir;
};

/**
 * Ajoute une ressource à un challenge
 */
export const addResourceToChallenge = async (
  challengeId: string,
  eventId: string,
  userId: string,
  file: FileUpload,
  metadata: ResourceMetadata
) => {
  // Vérifier l'accès au challenge
  const challenge = await checkChallengeAccess(challengeId, eventId, userId);

  // Créer le dossier pour stocker les ressources
  const uploadDir = ensureUploadDir(challengeId);

  // Générer un nom de fichier unique
  const originalFilename = file.name || "unnamed-file";
  const fileExtension = path.extname(originalFilename);
  const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
  const filePath = path.join(uploadDir, uniqueFilename);
  const relativePath = path.join("challenges", challengeId, uniqueFilename);

  // Enregistrer le fichier
  const buffer = await file.arrayBuffer();
  await Bun.write(filePath, buffer);

  // Créer l'entrée dans la base de données
  const upload = (await prisma.upload.create({
    data: {
      filename: originalFilename,
      path: relativePath,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      userId,
      teamId: challenge.teamId,
      challengeId,
      // @ts-ignore - Le champ metadata existe dans le schéma mais pas encore dans les types générés
      metadata: metadata,
    },
  })) as UploadWithMetadata;

  return upload;
};

/**
 * Récupère toutes les ressources d'un challenge
 */
export const getResourcesByChallenge = async (
  challengeId: string,
  eventId: string,
  userId: string
) => {
  // Vérifier l'accès au challenge
  await checkChallengeAccess(challengeId, eventId, userId);

  // Récupérer toutes les ressources du challenge
  const resources = await prisma.upload.findMany({
    where: { challengeId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return resources;
};

/**
 * Récupère une ressource spécifique
 */
export const getResourceById = async (
  resourceId: string,
  challengeId: string,
  eventId: string,
  userId: string
) => {
  // Vérifier l'accès au challenge
  await checkChallengeAccess(challengeId, eventId, userId);

  // Récupérer la ressource
  const resource = await prisma.upload.findUnique({
    where: {
      id: resourceId,
      challengeId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  if (!resource) {
    throw new Error("Ressource non trouvée");
  }

  return resource;
};

/**
 * Supprime une ressource
 */
export const deleteResource = async (
  resourceId: string,
  challengeId: string,
  eventId: string,
  userId: string
) => {
  // Vérifier l'accès au challenge
  await checkChallengeAccess(challengeId, eventId, userId);

  // Récupérer la ressource
  const resource = await prisma.upload.findUnique({
    where: {
      id: resourceId,
      challengeId,
    },
  });

  if (!resource) {
    throw new Error("Ressource non trouvée");
  }

  // Vérifier si l'utilisateur est le propriétaire de la ressource ou un admin de l'équipe
  if (resource.userId !== userId) {
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: resource.teamId || "",
        },
      },
    });

    if (
      !teamMember ||
      (teamMember.role !== "OWNER" && teamMember.role !== "ADMIN")
    ) {
      throw new Error("Non autorisé à supprimer cette ressource");
    }
  }

  // Supprimer le fichier
  const filePath = path.join(process.cwd(), "uploads", resource.path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Supprimer l'entrée de la base de données
  await prisma.upload.delete({
    where: { id: resourceId },
  });

  return { success: true };
};

/**
 * Met à jour les métadonnées d'une ressource
 */
export const updateResource = async (
  resourceId: string,
  challengeId: string,
  eventId: string,
  userId: string,
  metadata: ResourceMetadata,
  file?: FileUpload
) => {
  // Vérifier l'accès au challenge
  await checkChallengeAccess(challengeId, eventId, userId);

  // Récupérer la ressource
  const resource = (await prisma.upload.findUnique({
    where: {
      id: resourceId,
      challengeId,
    },
  })) as UploadWithMetadata;

  if (!resource) {
    throw new Error("Ressource non trouvée");
  }

  // Vérifier si l'utilisateur est le propriétaire de la ressource ou un admin de l'équipe
  if (resource.userId !== userId) {
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: resource.teamId || "",
        },
      },
    });

    if (
      !teamMember ||
      (teamMember.role !== "OWNER" && teamMember.role !== "ADMIN")
    ) {
      throw new Error("Non autorisé à modifier cette ressource");
    }
  }

  let updatedData: any = {
    metadata: {
      ...((resource.metadata as Record<string, any>) || {}),
      ...metadata,
    },
  };

  // Si un nouveau fichier est fourni, le remplacer
  if (file) {
    // Supprimer l'ancien fichier
    const oldFilePath = path.join(process.cwd(), "uploads", resource.path);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }

    // Enregistrer le nouveau fichier
    const uploadDir = ensureUploadDir(challengeId);
    const originalFilename = file.name || "unnamed-file";
    const fileExtension = path.extname(originalFilename);
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    const relativePath = path.join("challenges", challengeId, uniqueFilename);

    const buffer = await file.arrayBuffer();
    await Bun.write(filePath, buffer);

    updatedData = {
      ...updatedData,
      filename: originalFilename,
      path: relativePath,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
    };
  }

  // Mettre à jour la ressource
  const updatedResource = (await prisma.upload.update({
    where: { id: resourceId },
    data: updatedData,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  })) as UploadWithMetadata & {
    user: { id: string; username: string; avatar: string | null };
  };

  return updatedResource;
};

/**
 * Récupère le contenu d'une ressource pour téléchargement
 */
export const getResourceContent = async (
  resourceId: string,
  challengeId: string,
  eventId: string,
  userId: string
): Promise<{ resource: Upload; content: Buffer }> => {
  // Vérifier l'accès au challenge
  await checkChallengeAccess(challengeId, eventId, userId);

  // Récupérer la ressource
  const resource = await prisma.upload.findUnique({
    where: {
      id: resourceId,
      challengeId,
    },
  });

  if (!resource) {
    throw new Error("Ressource non trouvée");
  }

  // Récupérer le fichier
  const filePath = path.join(process.cwd(), "uploads", resource.path);
  if (!fs.existsSync(filePath)) {
    throw new Error("Fichier non trouvé");
  }

  const buffer = await fs.promises.readFile(filePath);

  return { resource, content: buffer };
};
