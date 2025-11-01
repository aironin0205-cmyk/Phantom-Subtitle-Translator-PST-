import Fastify from 'fastify';
import cors from 'fastify-cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// --- ROBUST PATH RESOLUTION ---
// This is the key fix. It correctly determines the absolute path to our project directory.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ---

// Load environment variables from a .env file into process.env
dotenv.config();

const server = Fastify({
  logger: true,
});

// Register the CORS plugin
await server.register(cors, {
  origin: process.env.FRONTEND_URL || '*',
});

// --- DYNAMIC PLUGIN REGISTRATION (THE FIX) ---
// Instead of a static import, we use a dynamic import with the absolute path.
// This is a much more reliable way to load modules.
server.register(import(join(__dirname, 'src', 'features', 'translation', 'controller.js')), { 
  prefix: '/api/translation' 
});
// ---

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
