// ===== DEVELOPMENT/DEBUG MONGO CLIENT (MANAGED SINGLETON) =====
// This module is refactored to include a live health check, more robust connection logic,
// and better integration with our application's custom error system.

// ===== IMPORTS & DEPENDENCIES =====
import { MongoClient } from 'mongodb';
import config from '#config';
import { ServiceUnavailableError } from '../utils/errors.js'; // Import our custom error

// ===== MODULE-LEVEL CLIENT STATE =====
let client;
let dbInstance;

// ===== CONNECTION & HEALTH CHECK LOGIC =====
/**
 * Establishes a connection to the MongoDB server and a specific database.
 * This function is idempotent and includes explicit validation of the connection URI.
 * @param {object} logger - The Pino logger instance.
 */
export async function connectToMongo(logger) {
  if (dbInstance) {
    logger.info('MongoDB connection already established. Skipping connection.');
    return;
  }

  try {
    logger.info('Initializing MongoDB client and connecting...');

    // --- Hardened Connection Logic ---
    // We now explicitly parse the DB name from the URI to prevent accidental connections
    // to the wrong database (e.g., the default 'test' db).
    const url = new URL(config.MONGO_URI);
    const dbName = url.pathname.slice(1); // Remove leading '/'

    if (!dbName) {
      // This is a configuration error and is fatal.
      logger.fatal('Fatal Error: MONGO_URI must include a database name (e.g., mongodb://.../myDatabase).');
      process.exit(1);
    }
    // --- End Hardened Logic ---

    client = new MongoClient(config.MONGO_URI, {
      // Recommended options for modern MongoDB drivers
      appName: 'pst-backend',
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();

    // Explicitly connect to the parsed database name.
    dbInstance = client.db(dbName);
    logger.info(`Successfully connected to MongoDB database: "${dbName}".`);

  } catch (err) {
    logger.fatal({ err }, 'Fatal Error: Failed to connect to MongoDB.');
    process.exit(1);
  }
}

/**
 * Provides access to the established database instance.
 * @returns {import('mongodb').Db} The MongoDB database instance.
 * @throws {ServiceUnavailableError} If the database connection has not been established.
 */
export function getDb() {
  if (!dbInstance) {
    // Using a specific error type allows for more intelligent error handling upstream.
    throw new ServiceUnavailableError('Database not connected. Ensure connectToMongo() is called on startup.');
  }
  return dbInstance;
}

/**
 * Closes the MongoDB connection during graceful shutdown.
 * @param {object} logger - The Pino logger instance.
 */
export async function closeMongoConnection(logger) {
  if (client) {
    try {
      logger.info('Closing MongoDB connection...');
      await client.close();
      logger.info('MongoDB connection closed successfully.');
    } catch (err) {
      logger.error({ err }, 'Error closing MongoDB connection.');
    }
  } else {
    logger.warn('Attempted to close MongoDB connection, but no client was initialized.');
  }
}

/**
 * Performs a live health check on the MongoDB connection.
 * This is used by the /health endpoint to verify dependency status.
 * @returns {Promise<{name: string, isHealthy: boolean, message: string}>}
 */
export async function getMongoStatus() {
  if (!client || !dbInstance) {
    return { name: 'MongoDB', isHealthy: false, message: 'Client not initialized.' };
  }

  try {
    // The 'ping' command is a lightweight, standard way to check server responsiveness.
    await dbInstance.admin().command({ ping: 1 });
    return { name: 'MongoDB', isHealthy: true, message: 'Connection healthy.' };
  } catch (error) {
    // The health check should not log errors itself, but report the failure state.
    // The calling service (app.js) will log the full health report.
    return { name: 'MongoDB', isHealthy: false, message: error.message };
  }
}
