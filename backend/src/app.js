// ===== APPLICATION FACTORY =====

// ===== IMPORTS & DEPENDENCIES =====
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import healthcheck from '@fastify/healthcheck';
import config from '#config';
import translationRoutes from './features/translation/controller.js';

/**
 * Builds and configures the Fastify server instance.
 * This function encapsulates all server setup logic, making it reusable and testable.
 * By separating the app's construction from its execution, we can easily write
 * integration tests without actually listening on a port.
 *
 * @param {object} logger - A pino logger instance.
 * @returns {Promise<Fastify.FastifyInstance>} - The configured Fastify server instance.
 */
export async function buildServer(logger) {
  const server = Fastify({
    logger: logger, // Use the custom, environment-aware logger.
  });

  // ===== ESSENTIAL SECURITY MIDDLEWARE =====
  // 1. Helmet: Adds various HTTP headers to secure the app from common vulnerabilities.
  await server.register(helmet, { contentSecurityPolicy: false });

  // 2. CORS: Enables Cross-Origin Resource Sharing for your whitelisted frontend.
  await server.register(cors, {
    origin: config.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // 3. Rate Limiting: Protects against brute-force attacks.
  await server.register(rateLimit, {
    max: config.RATE_LIMIT_MAX_REQUESTS,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
  });

  // Manually implement the health check route.
// This removes the problematic dependency while providing the same functionality.
server.get('/health', async (request, reply) => {
  // In a more advanced setup, you could check database connections here.
  // For now, returning a simple 200 OK is all Render needs.
  return { status: 'ok' };
});

  // ===== GLOBAL ERROR HANDLER =====
  // Catches any unhandled errors, ensuring a consistent response and preventing stack trace leaks.
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
