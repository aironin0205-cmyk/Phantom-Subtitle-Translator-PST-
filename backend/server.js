import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
// UPDATED IMPORT
import translationRoutes from '#features/translation/controller.js';

dotenv.config();
const server = Fastify({ logger: true });

await server.register(cors, { origin: process.env.FRONTEND_URL || '*' });
server.register(translationRoutes, { prefix: '/api/translation' });

server.get('/', () => ({ status: 'ok', message: 'PST Backend is online.' }));

const start = async () => { /* ... (rest of the file is the same) ... */ };
start();
