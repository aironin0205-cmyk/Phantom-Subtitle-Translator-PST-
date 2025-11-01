// ===== IMPORTS & DEPENDENCIES =====
import { Pinecone } from '@pinecone-database/pinecone';

// ===== CONFIGURATION & CONSTANTS =====
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'pst-translations';

if (!PINECONE_API_KEY) {
  throw new Error("FATAL ERROR: PINECONE_API_KEY environment variable is not set.");
}

// ===== SINGLETON CLIENT INITIALIZATION =====
let pineconeIndex = null;

/**
 * Initializes the Pinecone client and connects to the specified index.
 * @param {import('fastify').FastifyLoggerInstance} logger - The server logger instance.
 */
export async function connectToPinecone(logger) {
  if (pineconeIndex) {
    logger.info('Pinecone connection already established.');
    return;
  }
  try {
    logger.info('Connecting to Pinecone...');
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);
    logger.info(`Successfully connected to Pinecone index [${PINECONE_INDEX_NAME}].`);
  } catch (err) {
    logger.error({ err }, 'Failed to connect to Pinecone.');
    process.exit(1);
  }
}

/**
 * Returns the connected Pinecone index instance.
 * @returns {import('@pinecone-database/pinecone').Index} The Pinecone index instance.
 */
export function getPineconeIndex() {
  if (!pineconeIndex) {
    throw new Error('Pinecone not connected. Ensure connectToPinecone() is called on startup.');
  }
  return pineconeIndex;
}
