// ===== PRODUCTION-READY SERVER ENTRYPOINT =====

// ===== IMPORTS & DEPENDENCIES =====
import pino from 'pino';
import config from '#config';
import { buildServer } from './src/app.js';
import { connectToMongo, closeMongoConnection } from '#lib/mongoClient.js';
import { connectToPinecone, closePineconeConnection } from '#lib/pineconeClient.js';

// ===== LOGGER INITIALIZATION =====
// A custom logger that is environment-aware.
// In development, it uses 'pino-pretty' for human-readable, colorized logs.
// In production, it outputs structured JSON, which is the standard for efficient log
// aggregation, searching, and analysis with tools like Datadog, Logstash, or Papertrail.
const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname', // Hides verbose but less useful fields in dev.
      },
    },
  }),
});

// ===== INITIALIZATION & STARTUP =====
async function start() {
  let server;
  try {
    logger.info('Application starting up...');
    logger.debug({ config }, 'Loaded application configuration.');

    // Step 1: Build the server instance by calling our app factory.
    // This encapsulates all routes, plugins, and error handlers.
    server = await buildServer(logger);
    logger.info('Server instance built.');

    // Step 2: Connect to external dependencies (databases, etc.).
    // It's crucial these connections are established *before* the server starts accepting traffic.
    await connectToMongo(logger);
    await connectToPinecone(logger);
    logger.info('Database connections established successfully.');

    // Step 3: Start listening for incoming HTTP requests.
    await server.listen({ port: config.PORT, host: config.HOST });
    logger.info(`Server listening on http://${config.HOST}:${config.PORT}`);

  } catch (err) {
    // If any step in the startup process fails, log it as a fatal error and exit.
    logger.fatal(err, 'Application failed to start.');
    process.exit(1);
  }

  // ===== GRACEFUL SHUTDOWN HANDLERS =====
  // This logic is critical for production reliability. It ensures that when the
  // application is told to stop (e.g., during a deployment on Render), it finishes
  // processing current requests and closes database connections cleanly.
  const shutdown = async (signal) => {
    logger.warn(`Received ${signal}. Starting graceful shutdown...`);
    try {
      // 1. Stop accepting new requests.
      await server.close();
      logger.info('HTTP server closed.');

      // 2. Close database connections.
      await closeMongoConnection(logger);
      await closePineconeConnection(logger);
      logger.info('Database connections closed.');

      // 3. Exit the process successfully.
      process.exit(0);
    } catch (err)
      logger.error(err, 'Error during graceful shutdown.');
      process.exit(1);
    }
  };

  // Listen for termination signals. SIGINT is Ctrl+C in a terminal.
  // SIGTERM is the standard signal for process termination sent by orchestrators like Docker and Render.
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// ---- Start the application ----
start();
