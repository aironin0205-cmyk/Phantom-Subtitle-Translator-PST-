// ===== PRODUCTION-READY MONGO CLIENT (MANAGED SINGLETON) =====
// This module manages a single, persistent connection to MongoDB.
// It ensures the connection is established on startup, can be shared across
// the application, and is closed gracefully on shutdown.

// ===== IMPORTS & DEPENDENCIES =====
import { MongoClient } from 'mongodb';
import config from '#config'; // Use our centralized, validated config.

// ===== MODULE-LEVEL CLIENT STATE =====
// These variables hold the singleton instances for the client and the database.
// They are defined at the module level to be accessible by all exported functions.
let client;
let dbInstance;

// ===== CONNECTION LOGIC =====
/**
 * Establishes a connection to the MongoDB server.
 * This function is idempotent; it will not create a new connection if one already exists.
 * It initializes the singleton client and dbInstance.
 * @param {object} logger - The Pino logger instance.
 */
export async function connectToMongo(logger) {
  if (dbInstance) {
    logger.info('MongoDB connection already established. Skipping connection.');
    return;
  }

  try {
    logger.info('Initializing MongoDB client and connecting...');
    
    // Initialize the client with the URI from our central config.
    // The validation for MONGO_URI is now handled in the config module.
    client = new MongoClient(config.MONGO_URI);

    await client.connect();
    
    // The client.db() method without arguments uses the default database
    // specified in the connection string URI.
    dbInstance = client.db(); 
    
    logger.info('Successfully connected to MongoDB.');
  } catch (err) {
    logger.fatal({ err }, 'Fatal Error: Failed to connect to MongoDB.');
    // A failed database connection is a critical error; the application cannot run without it.
    process.exit(1);
  }
}

/**
 * Provides access to the established database instance.
 * This is the "public API" for other parts of the application (e.g., repositories)
 * to interact with the database.
 * @returns {import('mongodb').Db} The MongoDB database instance.
 * @throws {Error} If the database connection has not been established yet.
 */
export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not connected. Ensure connectToMongo() is called successfully on application startup.');
  }
  return dbInstance;
}

/**
 * Closes the MongoDB connection.
 * This function is essential for the graceful shutdown process.
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
