// ===== PRODUCTION-READY PINECONE CLIENT (MANAGED SINGLETON) =====
// This module manages a single, reusable reference to a Pinecone index.
// It initializes on startup and provides a getter for other application parts.

// ===== IMPORTS & DEPENDENCIES =====
import { Pinecone } from '@pinecone-database/pinecone';
import config from '#config'; // Use our centralized, validated config.

// ===== MODULE-LEVEL CLIENT STATE =====
// This variable will hold the singleton instance of the Pinecone index client.
let pineconeIndex = null;

// ===== CONNECTION LOGIC =====
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

  try {
    logger.info('Initializing Pinecone client...');

    // The validation for these keys is now handled in our central config module.
    const pinecone = new Pinecone({ apiKey: config.PINECONE_API_KEY });
    
    pineconeIndex = pinecone.index(config.PINECONE_INDEX_NAME);
    
    logger.info(`Successfully initialized Pinecone client for index [${config.PINECONE_INDEX_NAME}].`);
  } catch (err) {
    logger.fatal({ err }, 'Fatal Error: Failed to initialize Pinecone client.');
    // A failed Pinecone connection is critical for the application's core functionality.
    process.exit(1);
  }
}

/**
 * Provides access to the established Pinecone index instance.
 * @returns {import('@pinecone-database/pinecone').Index} The Pinecone index instance.
 * @throws {Error} If the Pinecone index has not been initialized yet.
 */
export function getPineconeIndex() {
  if (!pineconeIndex) {
    throw new Error('Pinecone index not initialized. Ensure connectToPinecone() is called successfully on application startup.');
  }
  return pineconeIndex;
}

/**
 * Placeholder for graceful shutdown. The Pinecone V2 client is stateless (uses HTTPS REST APIs),
 * so there is no persistent connection to close. This function exists to maintain a consistent
 * shutdown pattern with other stateful clients like MongoDB.
 * @param {object} logger - The Pino logger instance.
 */
export async function closePineconeConnection(logger) {
  if (pineconeIndex) {
    logger.info('Pinecone client is stateless; no connection to close. Shutdown step complete.');
  } else {
    logger.warn('Attempted to close Pinecone connection, but no client was initialized.');
  }
  // Return a resolved promise to maintain an async signature.
  return Promise.resolve();
}
