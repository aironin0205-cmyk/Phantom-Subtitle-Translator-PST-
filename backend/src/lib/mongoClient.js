// ===== IMPORTS & DEPENDENCIES =====
import { MongoClient } from 'mongodb';

// ===== CONFIGURATION & CONSTANTS =====
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("FATAL ERROR: MONGODB_URI environment variable is not set.");
}

// ===== SINGLETON CLIENT INITIALIZATION =====
const client = new MongoClient(MONGODB_URI);
let dbInstance = null;

// ===== CONNECTION LOGIC =====
/**
 * Connects to the MongoDB database and sets the shared dbInstance.
 * @param {import('fastify').FastifyLoggerInstance} logger - The server logger instance.
 */
export async function connectToMongo(logger) {
  if (dbInstance) {
    logger.info('MongoDB connection already established.');
    return;
  }
  try {
    logger.info('Connecting to MongoDB...');
    await client.connect();
    dbInstance = client.db(); // Using the default DB from the connection string
    logger.info('Successfully connected to MongoDB.');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to MongoDB.');
    process.exit(1);
  }
}

/**
 * Returns the connected database instance.
 * @returns {import('mongodb').Db} The MongoDB database instance.
 */
export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not connected. Ensure connectToMongo() is called on startup.');
  }
  return dbInstance;
}
