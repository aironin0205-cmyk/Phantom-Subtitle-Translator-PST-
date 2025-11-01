import Fastify from 'fastify';
import cors from 'fastify-cors';
import dotenv from 'dotenv';
import translationRoutes from './src/features/translation/controller.js';

// Load environment variables from a .env file into process.env
dotenv.config();

const server = Fastify({
  logger: true, // Enables built-in, production-ready logging
});

// Register the CORS plugin to allow requests from our frontend's domain
// In production, you would replace '*' with your actual frontend URL for security
await server.register(cors, {
  origin: process.env.FRONTEND_URL || '*',
});

// Register our feature-specific routes
// All routes defined in the controller will be prefixed with '/api/translation'
server.register(translationRoutes, { prefix: '/api/translation' });

// A simple "health check" route to confirm the server is running
server.get('/', () => ({
  status: 'ok',
  message: 'Phantom Subtitle Translator (PST) Backend is online and operational.',
}));

// The startup function
const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    // The '0.0.0.0' host is crucial for deployment platforms like Render
    await server.listen({ port: parseInt(port, 10), host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
