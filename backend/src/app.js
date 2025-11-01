// ===== PRODUCTION-READY APPLICATION FACTORY =====

// ===== IMPORTS & DEPENDENCIES =====
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
// THE FIX: The line below has been DELETED.
// import healthcheck from '@fastify/healthcheck'; // <-- DELETE THIS LINE
import config from '#config';
import translationRoutes from './features/translation/controller.js';

/**
 * Builds and configures the Fastify server instance.
 * @param {object} logger - A pino logger instance.
 * @returns {Promise<Fastify.FastifyInstance>} - The configured Fastify server instance.
 */
export async function buildServer(logger) {
  const server = Fastify({
    logger: logger,
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

  // ===== HEALTH CHECK ENDPOINT =====
  // THE FIX: We are now using our manual implementation, not the removed package.
  server.get('/health', async (request, reply) => {
    return { status: 'ok' };
  });

  // ===== GLOBAL ERROR HANDLER =====
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error, `Unhandled error for request: ${request.id}`);
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
