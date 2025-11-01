// ===== DEVELOPMENT/DEBUG SERVER ENTRYPOINT =====
// This version includes detailed comments explaining the "why" behind each change.

// ===== IMPORTS & DEPENDENCIES =====
import pino from 'pino';
import config from '#config';
import { buildServer } from './src/app.js';
import { connectToMongo, closeMongoConnection } from '#lib/mongoClient.js';
import { connectToPinecone, closePineconeConnection } from '#lib/pineconeClient.js';
import { connectToGemini, closeGeminiConnection } from '#lib/geminiClient.js';

// ===== LOGGER INITIALIZATION =====
// The logger setup is excellent. No changes needed here.
const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
});

// ===== GRACEFUL SHUTDOWN HANDLER =====
// We've moved the shutdown logic out of the `start` function to the module scope for clarity.
// A flag `isShuttingDown` is introduced to prevent race conditions or multiple calls.
let isShuttingDown = false;
async function gracefulShutdown(server, signal) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress. Ignoring signal.');
    return;
  }
  isShuttingDown = true;

  logger.warn(`Received ${signal}. Starting graceful shutdown...`);
  try {
    // 1. Stop accepting new connections
    await server.close();
    logger.info('HTTP server closed.');

    // 2. Close connections to external services
    await closeMongoConnection(logger);
    await closePineconeConnection(logger);
    // Note: Gemini SDK doesn't have an explicit close method, this is a placeholder
    // If it did, it would be called here. We keep the function for consistency.
    await closeGeminiConnection(logger);
    logger.info('Database and external service connections closed.');

    // 3. Exit the process
    logger.info('Graceful shutdown complete.');
    process.exit(0);
  } catch (err) {
    logger.error(err, 'Error during graceful shutdown.');
    process.exit(1);
  }
}

// ===== CORE STARTUP LOGIC =====
async function start() {
  let server;
  try {
    logger.info('Application starting up...');

    // Build the Fastify server instance
    server = await buildServer(logger);
    logger.info('Server instance built.');

    // Connect to all external services before starting the server
    await connectToMongo(logger);
    await connectToPinecone(logger);
    connectToGemini(logger);
    logger.info('Database and external service connections established.');

    // Start listening for requests
    await server.listen({ port: config.PORT, host: config.HOST });
    logger.info(`Server listening on http://${config.HOST}:${config.PORT}`);

    return server; // Return the server instance for use in handlers
  } catch (err) {
    logger.fatal(err, 'Application failed to start.');
    process.exit(1);
  }
}

// ===== APPLICATION BOOTSTRAP =====
// This is the main execution block.
const server = await start();

// ===== GLOBAL UNHANDLED ERROR LISTENERS =====
// These are critical for production stability. They catch any errors not handled
// within your application code, preventing an abrupt crash.

const setupGlobalErrorHandlers = (serverInstance) => {
  const shutdownHandler = (error, eventName) => {
    logger.fatal(error, `Unhandled error event: ${eventName}. Triggering graceful shutdown.`);
    gracefulShutdown(serverInstance, eventName);
  };

  // Listener for unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    // Creating a new Error object for a cleaner stack trace.
    shutdownHandler(new Error(`Unhandled Rejection at: ${promise}, reason: ${reason}`), 'unhandledRejection');
  });

  // Listener for uncaught synchronous exceptions
  process.on('uncaughtException', (error) => {
    shutdownHandler(error, 'uncaughtException');
  });

  // Listen for system signals to gracefully shut down
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, () => gracefulShutdown(server, signal));
  });
};

setupGlobalErrorHandlers(server);
start();
