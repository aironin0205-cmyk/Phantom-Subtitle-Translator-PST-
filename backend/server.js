// ===== PRODUCTION-READY SERVER ENTRYPOINT =====

// ===== IMPORTS & DEPENDENCIES =====
import pino from 'pino';
import config from '#config';
import { buildServer } from './src/app.js';
import { connectToMongo, closeMongoConnection } from '#lib/mongoClient.js';
import { connectToPinecone, closePineconeConnection } from '#lib/pineconeClient.js';
import { connectToGemini, closeGeminiConnection } from '#lib/geminiClient.js'; // Added Gemini

// ===== LOGGER INITIALIZATION =====
const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
});

// ===== INITIALIZATION & STARTUP =====
async function start() {
  let server;
  try {
    logger.info('Application starting up...');
    server = await buildServer(logger);
    logger.info('Server instance built.');

    // Connect to all external services
    await connectToMongo(logger);
    await connectToPinecone(logger);
    connectToGemini(logger); // Added Gemini connection
    logger.info('Database and external service connections established.');

    await server.listen({ port: config.PORT, host: config.HOST });
    logger.info(`Server listening on http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    logger.fatal(err, 'Application failed to start.');
    process.exit(1);
  }

  // ===== GRACEFUL SHUTDOWN HANDLERS =====
  const shutdown = async (signal) => {
    logger.warn(`Received ${signal}. Starting graceful shutdown...`);
    try {
      await server.close();
      logger.info('HTTP server closed.');

      await closeMongoConnection(logger);
      await closePineconeConnection(logger);
      await closeGeminiConnection(logger); // Added Gemini
      logger.info('Database and external service connections closed.');

      process.exit(0);
    } catch (err) {
      // THIS IS THE FIX: The curly braces {} are required here.
      logger.error(err, 'Error during graceful shutdown.');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
