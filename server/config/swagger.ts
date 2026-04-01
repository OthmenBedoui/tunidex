import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tunidex Marketplace API',
      version: '1.0.0',
      description: 'API documentation for the Tunidex Marketplace backend.',
      contact: {
        name: 'API Support',
        email: 'support@tunidex.tn',
      },
    },
    servers: [
      {
        url: `http://localhost:3000`,
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['USER', 'AGENT', 'ADMIN'] },
            balance: { type: 'number' },
            subscriptionTier: { type: 'string' },
          },
        },
        Listing: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            price: { type: 'number' },
            game: { type: 'string' },
            description: { type: 'string' },
            stock: { type: 'integer' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  // Point to the controller files where we write JSDoc
  apis: ['./controllers/*.ts'], 
};

export const swaggerSpec = swaggerJsdoc(options);