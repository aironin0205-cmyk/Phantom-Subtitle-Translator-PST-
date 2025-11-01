// ===== DEVELOPMENT/DEBUG GEMINI CLIENT (MANAGED SINGLETON) =====
// This version is refactored for improved observability, stricter contracts, and
// seamless integration with our application's error handling and health check systems.

// ===== IMPORTS & DEPENDENCIES =====
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import config from '#config';
import { ServiceUnavailableError } from '../utils/errors.js'; // Import our new error type

// ===== CUSTOM ERROR =====
/**
 * A specific error for when the Gemini API is unreachable or fails after all retries.
 * Extends ServiceUnavailableError to automatically produce a 503 HTTP status.
 */
class GeminiApiError extends ServiceUnavailableError {
  constructor(message, originalError) {
    super(message); // Pass user-friendly message to parent
    this.name = 'GeminiApiError';
    this.cause = originalError; // Retain original error for detailed logging
  }
}

// ===== MODULE-LEVEL CLIENT STATE =====
let genAI = null; // Holds the singleton instance

// Shared configuration for all Gemini calls. This is a good practice.
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ===== CONNECTION & HEALTH CHECK LOGIC =====
/**
 * Initializes the GoogleGenerativeAI client. Called once on application startup.
 * @param {object} logger - The global Pino logger instance.
 */
export function connectToGemini(logger) {
  if (genAI) {
    logger.info('Google AI client already initialized. Skipping.');
    return;
  }
  try {
    logger.info('Initializing Google AI client...');
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    logger.info('Google AI client initialized successfully.');
  } catch (err) {
    logger.fatal({ err }, 'Fatal Error: Failed to initialize Google AI client.');
    process.exit(1);
  }
}

/**
 * Placeholder for graceful shutdown. Exists for architectural consistency.
 */
export async function closeGeminiConnection(logger) {
  logger.info('Google AI client is stateless; no connection to close. Shutdown step complete.');
}

/**
 * Health check function for the Gemini client.
 * Fulfills the contract required by our deep health check in app.js.
 * @returns {Promise<{name: string, isHealthy: boolean, message: string}>}
 */
export async function getGeminiStatus() {
  const isHealthy = genAI !== null;
  return {
    name: 'GeminiClient',
    isHealthy,
    message: isHealthy ? 'Client initialized.' : 'Client not initialized.',
  };
}


// ===== CORE API CLIENT =====
/**
 * A robust, instrumented function for calling Gemini models with retry logic and contextual logging.
 * @param {object} params - The parameters for the API call.
 * @param {string} params.prompt - The complete, engineered prompt to send to the model.
 * @param {string} params.modelName - The specific model to use (e.g., config.GEMINI_TRANSLATION_MODEL).
 * @param {boolean} [params.expectJson=false] - If true, configures the model to return JSON.
 * @param {number} [params.temperature=0.5] - The generation temperature.
 * @param {object} logger - The request-specific, contextual Pino logger (with traceId).
 * @returns {Promise<string>} The raw text response from the model.
 * @throws {GeminiApiError} If the API call fails after all retry attempts.
 */
export async function callGemini({ prompt, modelName, expectJson = false, temperature = 0.5 }, logger) {
  // Guard Clauses: Enforce contracts for robust operation.
  if (!genAI) {
    throw new GeminiApiError('Gemini client not initialized. Ensure connectToGemini() is called on startup.');
  }
  if (!logger) {
    // This is a programmer error. The logger must always be passed.
    throw new Error('Contextual logger is required for callGemini.');
  }
  if (!modelName) {
    // This prevents the ambiguous model bug and forces the caller to be explicit.
    throw new Error('A specific `modelName` is required for callGemini.');
  }

  for (let attempt = 1; attempt <= config.GEMINI_MAX_RETRIES; attempt++) {
    try {
      const generationConfig = {
        temperature,
        ...(expectJson && { responseMimeType: 'application/json' }),
      };

      const model = genAI.getGenerativeModel({
        model: modelName,
        safetySettings,
        generationConfig,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return response.text();

    } catch (error) {
      const isLastAttempt = attempt === config.GEMINI_MAX_RETRIES;
      const logContext = { attempt, maxRetries: config.GEMINI_MAX_RETRIES, modelName, error: error.message };

      if (isLastAttempt) {
        logger.error(logContext, "Gemini API call failed on the final attempt.");
        throw new GeminiApiError(`Gemini API call to ${modelName} failed after ${config.GEMINI_MAX_RETRIES} attempts.`, { cause: error });
      }

      const delay = config.GEMINI_BACKOFF_MS * Math.pow(2, attempt - 1);
      logger.warn(logContext, `Gemini API call failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
                                  }
