import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// --- ROBUST PATH RESOLUTION (Still essential) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- STATIC IMPORT USING ABSOLUTE PATH ---
// We construct the absolute path and then use it in a standard import statement.
// Note: We must use the 'file://' protocol for absolute path imports in ES Modules.
const controllerPath = 'file://' + join(__dirname, 'src', 'features', 'translation', 'controller.js');
import translationRoutes from controllerPath;
// ---

// Load environment variables
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
