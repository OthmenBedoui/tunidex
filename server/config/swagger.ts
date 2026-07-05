import swaggerJsdoc from 'swagger-jsdoc';
import env from './env.js';

const publicAppUrl = env.authUrl.replace(/\/$/, '');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TuniBots Marketplace API',
      version: '1.0.0',
      description: 'API documentation for the TuniBots Marketplace backend.',
      contact: {
        name: 'API Support',
        email: 'support@tunibots.tn',
      },
    },
    servers: [
      {
        url: publicAppUrl,
        description: publicAppUrl.includes('localhost') ? 'Local Development Server' : 'Public Production Server',
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
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['GUEST', 'USER', 'AGENT', 'ADMIN'] },
            balance: { type: 'number' },
            avatarUrl: { type: 'string' },
            subscriptionTier: { type: 'string' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Listing: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            slug: { type: 'string' },
            price: { type: 'number' },
            isArchived: { type: 'boolean' },
            discountPercent: { type: 'integer', minimum: 0, maximum: 95 },
            discountType: { type: 'string', enum: ['NONE', 'PERCENT', 'AMOUNT'] },
            discountValue: { type: 'number', minimum: 0 },
            game: { type: 'string' },
            description: { type: 'string' },
            stock: { type: 'integer' },
            categoryId: { type: 'string' },
            subCategoryId: { type: 'string', nullable: true },
            source: { type: 'string', nullable: true },
            imageUrl: { type: 'string' },
            logoUrl: { type: 'string', nullable: true },
            gallery: {
              type: 'array',
              items: { type: 'string' },
            },
            deliveryTimeHours: { type: 'integer' },
            isInstant: { type: 'boolean' },
            preparationTime: { type: 'string', nullable: true },
            metaTitle: { type: 'string', nullable: true },
            metaDesc: { type: 'string', nullable: true },
            keywords: { type: 'string', nullable: true },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            icon: { type: 'string' },
            imageUrl: { type: 'string', nullable: true },
            gradient: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
          },
        },
        SubCategory: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            categoryId: { type: 'string' },
            icon: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            order: { type: 'integer' },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            listingId: { type: 'string' },
            quantity: { type: 'integer' },
            listing: { $ref: '#/components/schemas/Listing' },
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
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            orderId: { type: 'string', format: 'uuid', nullable: true },
            orderNumber: { type: 'string', nullable: true },
            orderStatus: { type: 'string', nullable: true },
            type: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            metadata: { type: 'object', nullable: true, additionalProperties: true },
            targetTab: { type: 'string', nullable: true },
            audience: { type: 'string', enum: ['CLIENT', 'ADMIN'], nullable: true },
            read: { type: 'boolean' },
            readAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        UploadAsset: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            absoluteUrl: { type: 'string' },
            relativePath: { type: 'string' },
            contentType: { type: 'string', enum: ['image/webp'] },
            width: { type: 'integer' },
            height: { type: 'integer' },
            size: { type: 'integer' }
          }
        },
        PaginatedUsersResponse: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' }
            },
            total: { type: 'integer' },
            nextCursor: { type: 'string', nullable: true }
          }
        },
        PaginatedOrdersResponse: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/Order' }
            },
            total: { type: 'integer' },
            nextCursor: { type: 'string', nullable: true }
          }
        },
        PaginatedListingsResponse: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/Listing' }
            },
            total: { type: 'integer' },
            nextCursor: { type: 'string', nullable: true }
          }
        },
        SiteConfig: {
          type: 'object',
          properties: {
            logoUrl: { type: 'string' },
            siteName: { type: 'string' },
            faviconUrl: { type: 'string' },
            primaryColor: { type: 'string' },
            smtpMailerName: { type: 'string' },
            smtpHost: { type: 'string' },
            smtpDriver: { type: 'string' },
            smtpPort: { type: 'string' },
            smtpUsername: { type: 'string' },
            smtpEmailId: { type: 'string' },
            smtpEncryption: { type: 'string' },
            smtpPassword: { type: 'string' },
            click2payEnabled: { type: 'boolean' },
            click2payMerchantId: { type: 'string' },
            click2payApiKey: { type: 'string' },
          },
        },
      },
    },
  },
  // Point to the controller files where we write JSDoc
  apis: ['./server/controllers/*.ts'], 
};

export const swaggerSpec = swaggerJsdoc(options);
