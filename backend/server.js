// ===== IMPORTS & DEPENDENCIES =====
import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import translationRoutes from '#features/translation/controller.js';

// ===== CONFIGURATION & CONSTANTS =====
dotenv.config();

const server = Fastify({ 
  logger: true // Enables structured, JSON-formatted logging. Essential for production.
});

// The port the server will listen on. Render provides this via an environment variable.
const PORT = process.env.PORT || 3001; 
// The host to bind to. '0.0.0.0' is required for containerized environments like Render.
const HOST = '0.0.0.0'; 

// ===== MIDDLEWARE & PLUGINS =====
// Register CORS plugin with security best practices.
// In production, FRONTEND_URL should be set to your specific domain.
await server.register(cors, { 
  origin: process.env.FRONTEND_URL || '*' 
});

// ===== API ROUTES & CONTROLLERS =====
// Health check route - crucial for Render to verify the service is online.
server.get('/', () => ({ status: 'ok', message: 'PST Backend is online.' }));

// Register all translation-related routes under a consistent, versionable prefix.
server.register(translationRoutes, { prefix: '/api/translation' });


// ===== INITIALIZATION & STARTUP =====
/**
 * Starts the Fastify server with production-ready configurations.
 */
const start = async () => {
  try {
    await server.listen({ port: PORT, host: HOST });
    // The default logger will print a message like:
    // {"level":30,"time":1670000000000,"pid":12345,"hostname":"your-machine","msg":"Server listening at http://0.0.0.0:3001"}
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
