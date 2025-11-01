// ===== DEVELOPMENT/DEBUG APPLICATION FACTORY =====
// This version includes detailed comments explaining our new, more robust architecture.

// ===== IMPORTS & DEPENDENCIES =====
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

import config from '#config';
import translationRoutes from '#features/translation/controller.js';
import { ApiError } from './utils/errors.js'; // Our new custom error class
import { getMongoStatus } from '#lib/mongoClient.js'; // We will add these functions
import { getPineconeStatus } from '#lib/pineconeClient.js'; // to their respective files later

/**
 * Builds and configures the Fastify server instance.
 * @param {object} logger - A pino logger instance.
 * @returns {Promise<Fastify.FastifyInstance>} - The configured Fastify server instance.
 */
export async function buildServer(logger) {
  const server = Fastify({
    logger: logger,
    // We add a custom request ID generator for better tracing.
    genReqId: () => randomUUID(),
  });

  // ===== TRACEID & CONTEXTUAL LOGGING HOOK =====
  // This hook runs for every request. It enriches the logger with the request ID
  // so that all logs generated during this request's lifecycle are automatically
  // tagged with its unique ID. This is a game-changer for debugging.
  server.addHook('preHandler', (request, reply, done) => {
    request.log = logger.child({ traceId: request.id });
    done();
  });

  // ===== ESSENTIAL SECURITY MIDDLEWARE =====
  await server.register(helmet, {
    // Disabling CSP for now as it often requires fine-tuning for specific frontends.
    // In a real production scenario, this should be configured properly.
    contentSecurityPolicy: false,
  });
  await server.register(cors, {
    origin: config.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });
  await server.register(rateLimit, {
    max: config.RATE_LIMIT_MAX_REQUESTS,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
  });

  // ===== ADVANCED HEALTH CHECK ENDPOINT =====
  // This health check is now "deep", meaning it verifies the status of
  // its critical dependencies. Render can use this for more intelligent restarts.
  server.get('/health', async (request, reply) => {
    const mongoStatus = await getMongoStatus();
    const pineconeStatus = await getPineconeStatus();
    const isHealthy = mongoStatus.isHealthy && pineconeStatus.isHealthy;

    const healthDetails = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      dependencies: [mongoStatus, pineconeStatus],
    };

    const httpStatus = isHealthy ? 200 : 503; // 503 Service Unavailable
    reply.status(httpStatus).send(healthDetails);
  });

  // ===== ADVANCED GLOBAL ERROR HANDLER =====
  // This handler is now much smarter. It differentiates between our custom ApiErrors,
  // Zod validation errors, and unexpected system errors.
  server.setErrorHandler((error, request, reply) => {
    // Use the contextual logger with traceId
    const log = request.log || server.log;

    if (error instanceof ZodError) {
      log.warn(error, 'Validation error');
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Input validation failed',
        details: error.flatten().fieldErrors,
      });
    }

    if (error instanceof ApiError) {
      // For our custom, operational errors, we trust the message and status
      log.warn(error, 'API Error');
      return reply.status(error.httpStatus).send({
        statusCode: error.httpStatus,
        error: error.name,
        message: error.message,
      });
    }

    // For all other errors, we treat them as critical and unexpected.
    log.error(error, `Unhandled internal error for request: ${request.id}`);
    if (config.NODE_ENV === 'production') {
      reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred.',
      });
    } else {
      // In development, we provide full details for easier debugging.
      reply.status(500).send({
        statusCode: 500,
        error: error.name || 'Internal Server Error',
        message: error.message,
        stack: error.stack,
      });
    }
  });

  // ===== API ROUTES & CONTROLLERS =====
  server.get('/', () => ({ status: 'ok', message: 'PST Backend is online.' }));
  server.register(translationRoutes, { prefix: '/api/translation' });

  return server;
}```

### 2. Production-Ready Version (`src/app.js`)

```javascript
// ===== PRODUCTION-READY APPLICATION FACTORY =====

// ===== IMPORTS & DEPENDENCIES =====
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

import config from '#config';
import translationRoutes from '#features/translation/controller.js';
import { ApiError } from './utils/errors.js';
import { getMongoStatus } from '#lib/mongoClient.js';
import { getPineconeStatus } from '#lib/pineconeClient.js';

/**
 * Builds and configures the Fastify server instance.
 * @param {object} logger - A pino logger instance.
 * @returns {Promise<Fastify.FastifyInstance>} - The configured Fastify server instance.
 */
export async function buildServer(logger) {
  const server = Fastify({
    logger: logger,
    genReqId: () => randomUUID(),
  });

  // Add traceId to every request log
  server.addHook('preHandler', (request, reply, done) => {
    request.log = logger.child({ traceId: request.id });
    done();
  });

  // ===== ESSENTIAL SECURITY MIDDLEWARE =====
  await server.register(helmet, { contentSecurityPolicy: false });
  await server.register(cors, {
    origin: config.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });
  await server.register(rateLimit, {
    max: config.RATE_LIMIT_MAX_REQUESTS,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
  });

  // ===== DEEP HEALTH CHECK ENDPOINT =====
  server.get('/health', async (request, reply) => {
    const mongoStatus = await getMongoStatus();
    const pineconeStatus = await getPineconeStatus();
    const isHealthy = mongoStatus.isHealthy && pineconeStatus.isHealthy;

    const healthDetails = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      dependencies: [mongoStatus, pineconeStatus],
    };

    const httpStatus = isHealthy ? 200 : 503; // 503 Service Unavailable
    reply.status(httpStatus).send(healthDetails);
  });

  // ===== ADVANCED GLOBAL ERROR HANDLER =====
  server.setErrorHandler((error, request, reply) => {
    const log = request.log || server.log;

    if (error instanceof ZodError) {
      log.warn(error, 'Validation error');
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Input validation failed',
        details: error.flatten().fieldErrors,
      });
    }

    if (error instanceof ApiError) {
      log.warn(error, 'API Error');
      return reply.status(error.httpStatus).send({
        statusCode: error.httpStatus,
        error: error.name,
        message: error.message,
      });
    }

    log.error(error, `Unhandled internal error for request: ${request.id}`);
    if (config.NODE_ENV === 'production') {
      reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred.',
      });
    } else {
      reply.status(500).send({
        statusCode: 500,
        error: error.name || 'Internal Server Error',
        message: error.message,
        stack: error.stack,
      });
    }
  });

  // ===== API ROUTES & CONTROLLERS =====
  server.get('/', () => ({ status: 'ok', message: 'PST Backend is online.' }));
  server.register(translationRoutes, { prefix: '/api/translation' });

  return server;
          }
