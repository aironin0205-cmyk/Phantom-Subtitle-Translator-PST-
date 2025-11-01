// ===== DEVELOPMENT/DEBUG PINECONE CLIENT (MANAGED SINGLETON) =====
// This module is refactored to include a live health check and integrate with
// our application's standard error handling system for better consistency and reliability.

// ===== IMPORTS & DEPENDENCIES =====
import { Pinecone } from '@pinecone-database/pinecone';
import config from '#config';
import { ServiceUnavailableError } from '../utils/errors.js'; // Import our standard error

// ===== MODULE-LEVEL CLIENT STATE =====
let pineconeIndex = null;
let isInitializing = false; // Add a flag to prevent race conditions during startup

// ===== CONNECTION & HEALTH CHECK LOGIC =====
/**
 * Initializes the Pinecone client and gets a reference to the specified index.
 * This function is idempotent and will not re-initialize if already connected.
 * @param {object} logger - The Pino logger instance.
 */
export async function connectToPinecone(logger) {
  if (pineconeIndex) {
    logger.info('Pinecone index reference already established. Skipping initialization.');
    return;
  }
  if (isInitializing) {
    logger.warn('Pinecone initialization already in progress. Skipping.');
    return;
  }

  try {
    isInitializing = true;
    logger.info('Initializing Pinecone client...');

    const pinecone = new Pinecone({ apiKey: config.PINECONE_API_KEY });
    pineconeIndex = pinecone.index(config.PINECONE_INDEX_NAME);

    // Perform a quick check on startup to ensure the index is accessible.
    await pineconeIndex.describeIndexStats();

    logger.info(`Successfully connected to Pinecone index [${config.PINECONE_INDEX_NAME}].`);
  } catch (err) {
    logger.fatal({ err }, 'Fatal Error: Failed to initialize or connect to Pinecone index.');
    process.exit(1);
  } finally {
    isInitializing = false;
  }
}

/**
 * Provides access to the established Pinecone index instance.
 * @returns {import('@pinecone-database/pinecone').Index} The Pinecone index instance.
 * @throws {ServiceUnavailableError} If the Pinecone index has not been initialized yet.
 */
export function getPineconeIndex() {
  if (!pineconeIndex) {
    // Use our application-standard error for consistency.
    throw new ServiceUnavailableError('Pinecone index not initialized. Ensure connectToPinecone() is called on startup.');
  }
  return pineconeIndex;
}

/**
 * Placeholder for graceful shutdown. Exists for architectural consistency.
 * @param {object} logger - The Pino logger instance.
 */
export async function closePineconeConnection(logger) {
  logger.info('Pinecone client is stateless; no connection to close. Shutdown step complete.');
}

/**
 * Performs a live health check against the Pinecone index.
 * This is used by the /health endpoint to verify dependency status. A call to describeIndexStats
 * is a lightweight way to confirm API key validity and network connectivity.
 * @returns {Promise<{name: string, isHealthy: boolean, message: string}>}
 */
export async function getPineconeStatus() {
  if (!pineconeIndex) {
    return { name: 'Pinecone', isHealthy: false, message: 'Client not initialized.' };
  }

  try {
    // This command validates the connection, API key, and index existence.
    await pineconeIndex.describeIndexStats();
    return { name: 'Pinecone', isHealthy: true, message: 'Connection healthy.' };
  } catch (error) {
    // Report the failure state without logging the error here. The /health endpoint will log it.
    return { name: 'Pinecone', isHealthy: false, message: error.message };
  }
}
