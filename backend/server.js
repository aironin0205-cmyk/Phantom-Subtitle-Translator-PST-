// ===== IMPORTS & DEPENDENCIES =====
import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import translationRoutes from '#features/translation/controller.js';
import { connectToMongo } from '#lib/mongoClient.js';
import { connectToPinecone } from '#lib/pineconeClient.js';

// ===== CONFIGURATION & CONSTANTS =====
dotenv.config();

const server = Fastify({ 
  logger: true
});

const PORT = process.env.PORT || 3001; 
const HOST = '0.0.0.0'; 

// ===== MIDDLEWARE & PLUGINS =====
await server.register(cors, { 
  origin: process.env.FRONTEND_URL || '*' 
});

// ===== API ROUTES & CONTROLLERS =====
server.get('/', () => ({ status: 'ok', message: 'PST Backend is online.' }));
server.register(translationRoutes, { prefix: '/api/translation' });


// ===== INITIALIZATION & STARTUP =====
const start = async () => {
  try {
    // Connect to databases BEFORE starting the web server.
    await connectToMongo(server.log);
    await connectToPinecone(server.log);
    
    await server.listen({ port: PORT, host: HOST });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
