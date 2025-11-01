import Fastify from 'fastify';
// CORRECTED IMPORT for the new package
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// This robust path resolution is still best practice, so we will keep it.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const server = Fastify({
  logger: true,
});

// Register the new CORS plugin
await server.register(cors, {
  origin: process.env.FRONTEND_URL || '*',
});

// Dynamically register our feature routes
server.register(import(join(__dirname, 'src', 'features', 'translation', 'controller.js')), { 
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
