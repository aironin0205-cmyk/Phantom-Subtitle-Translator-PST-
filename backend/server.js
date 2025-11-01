import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
// THIS IS THE FIX: A clean, standard relative import.
import translationRoutes from './src/features/translation/controller.js';

// Load environment variables from a .env file into process.env
dotenv.config();

const server = Fastify({
  logger: true,
});

// Register the CORS plugin
await server.register(cors, {
  origin: process.env.FRONTEND_URL || '*',
});

// Register our statically imported feature routes
server.register(translationRoutes, { 
  prefix: '/api/translation' 
});

// A simple "health check" route
server.get('/', () => ({
  status: 'ok',
  message: 'Phantom Subtitle Translator (PST) Backend is online and operational.',
}));

// The startup function
const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await server.listen({ port: parseInt(port, 10), host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
