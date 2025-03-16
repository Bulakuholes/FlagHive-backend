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
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Indique si la requête a réussi ou échoué",
          },
          message: {
            type: "string",
            description: "Message décrivant le résultat de l'opération",
          },
          data: {
            type: "object",
            description: "Données renvoyées en cas de succès",
            nullable: true,
          },
          error: {
            type: "object",
            description: "Informations sur l'erreur en cas d'échec",
            nullable: true,
            properties: {
              code: {
                type: "string",
                description: "Code d'erreur spécifique",
                nullable: true,
              },
              details: {
                type: "object",
                description: "Détails supplémentaires sur l'erreur",
                nullable: true,
              },
            },
          },
          meta: {
            type: "object",
            description: "Métadonnées de la réponse",
            properties: {
              timestamp: {
                type: "string",
                format: "date-time",
                description: "Horodatage de la réponse",
              },
              pagination: {
                type: "object",
                description: "Informations de pagination (si applicable)",
                nullable: true,
                properties: {
                  page: {
                    type: "integer",
                    description: "Numéro de page actuel",
                  },
                  limit: {
                    type: "integer",
                    description: "Nombre d'éléments par page",
                  },
                  total: {
                    type: "integer",
                    description: "Nombre total d'éléments",
                  },
                  totalPages: {
                    type: "integer",
                    description: "Nombre total de pages",
                  },
                },
              },
            },
          },
        },
      },
      SuccessResponse: {
        allOf: [
          {
            $ref: "#/components/schemas/ApiResponse",
          },
          {
            type: "object",
            properties: {
              success: {
                example: true,
              },
              error: {
                example: null,
              },
            },
          },
        ],
      },
      ErrorResponse: {
        allOf: [
          {
            $ref: "#/components/schemas/ApiResponse",
          },
          {
            type: "object",
            properties: {
              success: {
                example: false,
              },
              data: {
                example: null,
              },
            },
          },
        ],
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
