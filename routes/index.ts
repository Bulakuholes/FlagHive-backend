import type { Express } from "express";
import fs from "fs";
import path from "path";

/**
 * Charge automatiquement toutes les routes depuis les sous-dossiers
 * @param app Instance Express
 */
export const registerRoutes = (app: Express): void => {
  const routesDir = path.join(__dirname);

  // Je parcoure tous les dossiers dans le répertoire routes (sauf index.ts)
  fs.readdirSync(routesDir).forEach((item) => {
    const fullPath = path.join(routesDir, item);

    // Je vérifie si c'est un dossier et pas le fichier index.ts lui-même
    if (fs.statSync(fullPath).isDirectory()) {
      // Je cherche un fichier index.ts dans le dossier
      const indexFile = path.join(fullPath, "index.ts");

      if (fs.existsSync(indexFile)) {
        try {
          // Je charge dynamiquement le module de route
          const route = require(indexFile);

          // Si le module exporte une fonction 'register', l'appeler avec l'app Express
          if (typeof route.register === "function") {
            route.register(app);
            console.log(`Routes chargées depuis ${item}`);
          } else {
            console.warn(
              `Le module ${item} n'exporte pas de fonction 'register'`
            );
          }
        } catch (error) {
          console.error(
            `Erreur lors du chargement des routes depuis ${item}:`,
            error
          );
        }
      }
    } else if (item !== "index.ts" && item.endsWith(".ts")) {
      // Pour les fichiers .ts à la racine (comme swagger.ts)
      try {
        const route = require(`./${item}`);
        if (typeof route.register === "function") {
          route.register(app);
          console.log(`Routes chargées depuis ${item}`);
        }
      } catch (error) {
        console.error(
          `Erreur lors du chargement des routes depuis ${item}:`,
          error
        );
      }
    }
  });

  console.log("Toutes les routes ont été enregistrées");
};
