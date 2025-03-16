import fs from "fs";
import path from "path";

// Fonction pour parcourir récursivement un répertoire
function walkSync(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (
      stat.isDirectory() &&
      file !== "node_modules" &&
      file !== "dist" &&
      file !== ".git"
    ) {
      fileList = walkSync(filePath, fileList);
    } else if (
      stat.isFile() &&
      (file.endsWith(".ts") || file.endsWith(".js"))
    ) {
      // Exclure le script lui-même
      if (
        filePath !==
        path.join(process.cwd(), "scripts", "replace-console-logs.ts")
      ) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

// Fonction pour remplacer les console.log/warn/error par les fonctions de logging
function replaceConsoleLogsInFile(filePath: string): void {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    const originalContent = content;

    // Vérifier si le fichier importe déjà le logger
    const hasLoggerImport =
      content.includes("import { ") &&
      (content.includes(' from "../utils/logger"') ||
        content.includes(' from "./utils/logger"') ||
        content.includes(' from "../../utils/logger"') ||
        content.includes(' from "../../../utils/logger"') ||
        content.includes(' from "../../../../utils/logger"'));

    // Déterminer le chemin d'importation relatif
    let importPath = "";
    const relativePath = path
      .relative(
        path.dirname(filePath),
        path.join(process.cwd(), "utils", "logger")
      )
      .replace(/\\/g, "/");
    importPath = relativePath.startsWith(".")
      ? relativePath
      : `./${relativePath}`;

    // Remplacer les console.log, console.warn et console.error
    let needsImport = false;

    // Remplacer console.log
    if (content.includes("console.log(")) {
      content = content.replace(/console\.log\((.*?)\);/g, "info($1);");
      needsImport = true;
    }

    // Remplacer console.warn
    if (content.includes("console.warn(")) {
      content = content.replace(/console\.warn\((.*?)\);/g, "warn($1);");
      needsImport = true;
    }

    // Remplacer console.error
    if (content.includes("console.error(")) {
      // Cas spécial pour les erreurs avec un message et un objet d'erreur
      content = content.replace(
        /console\.error\("(.*?):", (.*?)\);/g,
        'logError($2 instanceof Error ? $2 : new Error(String($2)), "$1");'
      );
      // Cas général
      content = content.replace(/console\.error\((.*?)\);/g, "error($1);");
      needsImport = true;
    }

    // Ajouter l'import si nécessaire
    if (needsImport && !hasLoggerImport) {
      // Trouver la dernière ligne d'import
      const importLines = content
        .split("\n")
        .filter((line) => line.trim().startsWith("import "));
      const lastImportLine =
        importLines.length > 0 ? importLines[importLines.length - 1] : null;

      if (lastImportLine) {
        const lastImportIndex =
          content.indexOf(lastImportLine) + lastImportLine.length;
        const importStatement = `\nimport { info, warn, error, logError } from "${importPath}";`;
        content =
          content.slice(0, lastImportIndex) +
          importStatement +
          content.slice(lastImportIndex);
      } else {
        // Ajouter l'import au début du fichier
        content =
          `import { info, warn, error, logError } from "${importPath}";\n` +
          content;
      }
    }

    // Écrire le contenu modifié si des changements ont été effectués
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Fichier mis à jour: ${filePath}`);
    }
  } catch (err) {
    console.error(`Erreur lors du traitement du fichier ${filePath}:`, err);
  }
}

// Point d'entrée du script
function main() {
  const rootDir = process.cwd();
  const files = walkSync(rootDir);

  console.log(`Traitement de ${files.length} fichiers...`);

  files.forEach((file) => {
    replaceConsoleLogsInFile(file);
  });

  console.log("Terminé!");
}

main();
