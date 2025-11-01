// ===== PRODUCTION-READY GEMINI CLIENT (MANAGED SINGLETON) =====
// This module provides a robust, centralized interface for interacting with the Google Gemini API.
// It features a managed singleton, retry with exponential backoff, and centralized configuration.

// ===== IMPORTS & DEPENDENCIES =====
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import config from '#config'; // Use our centralized, validated config.

// ===== MODULE-LEVEL CLIENT STATE =====
// These variables hold the singleton client instance and the logger.
let genAI = null;
let moduleLogger = console; // Default to console for safety, but will be replaced.

// Shared configuration for all Gemini calls.
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ===== CONNECTION LOGIC =====
/**
 * Initializes the GoogleGenerativeAI client.
 * This is called once on application startup.
 * @param {object} logger - The Pino logger instance.
 */
export function connectToGemini(logger) {
  if (genAI) {
    logger.info('Google AI client already initialized. Skipping.');
    return;
  }
  moduleLogger = logger;
  try {
    moduleLogger.info('Initializing Google AI client...');
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    moduleLogger.info('Google AI client initialized successfully.');
  } catch (err) {
    moduleLogger.fatal({ err }, 'Fatal Error: Failed to initialize Google AI client.');
    process.exit(1);
  }
}

/**
 * Placeholder for graceful shutdown. The Gemini client is stateless (HTTPS).
 * This function exists for architectural consistency.
 * @param {object} logger - The Pino logger instance.
 */
export async function closeGeminiConnection(logger) {
  logger.info('Google AI client is stateless; no connection to close. Shutdown step complete.');
  return Promise.resolve();
}


// ===== CORE API CLIENT =====
/**
 * A robust function for calling Gemini models with retry logic.
 * @param {string} prompt The complete, engineered prompt to send to the model.
 * @param {object} [options={}] Configuration options for the API call.
 * @param {string} [options.modelName] The model to use. Defaults to the one in config.
 * @param {boolean} [options.expectJson=false] If true, configures the model to return JSON.
 * @returns {Promise<string>} The raw text response from the model.
 */
export async function callGemini(prompt, { modelName = config.GEMINI_MODEL, expectJson = false } = {}) {
  if (!genAI) {
    throw new Error('Gemini client not initialized. Ensure connectToGemini() is called on startup.');
  }

  for (let attempt = 1; attempt <= config.GEMINI_MAX_RETRIES; attempt++) {
    try {
      const generationConfig = {
        temperature: 0.5,
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
        moduleLogger.error(logContext, "Gemini API call failed on the final attempt.");
        throw new Error(`Gemini API call to ${modelName} failed after ${config.GEMINI_MAX_RETRIES} attempts.`, { cause: error });
      }

      const delay = config.GEMINI_BACKOFF_MS * Math.pow(2, attempt - 1);
      moduleLogger.warn(logContext, `Gemini API call failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
