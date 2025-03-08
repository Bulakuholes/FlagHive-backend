import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "API FlagHive",
    version: "1.0.0",
    description:
      "Documentation de l'API FlagHive pour la gestion des challenges CTF",
    contact: {
      name: "Équipe FlagHive",
      url: "https://flaghive.com",
      email: "contact@flaghive.com",
    },
  },
  servers: [
    {
      url: "/api",
      description: "Serveur de développement",
    },
    {
      url: "/api/v1",
      description: "API v1",
    },
  ],
  tags: [
    {
      name: "Challenges",
      description: "Gestion des challenges",
    },
    {
      name: "Notes",
      description: "Gestion des notes des challenges",
    },
    {
      name: "CSRF",
      description: "Gestion des tokens CSRF",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

const options = {
  swaggerDefinition,
  // Chemins vers les fichiers contenant les annotations Swagger
  apis: [
    "./routes/api/v1/**/*.ts",
    "./routes/api/index.ts",
    "./validation/**/*.ts",
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
