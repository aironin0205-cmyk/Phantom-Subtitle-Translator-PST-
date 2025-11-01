// ===== IMPORTS & DEPENDENCIES =====
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// ===== CONFIGURATION & CONSTANTS =====
const MAX_RETRIES = 3; // Number of times to retry a failed API call.
const INITIAL_BACKOFF_MS = 200; // Initial delay for retry, doubles each time.

// Fail-fast on startup if the API key is missing. This is a critical best practice.
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("FATAL ERROR: GEMINI_API_KEY environment variable is not set. The application cannot start.");
}

// Initialize the Gemini client singleton.
const genAI = new GoogleGenerativeAI(apiKey);

// Define standard safety settings for the model.
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ===== CORE API CLIENT =====

/**
 * A robust, centralized function for calling Gemini models with retry logic.
 * @param {string} prompt The complete, engineered prompt to send to the model.
 * @param {object} [options={}] Configuration options for the API call.
 * @param {string} [options.modelName='gemini-2.5-pro-latest'] The model to use (e.g., 'gemini-2.5-flash-latest').
 * @param {boolean} [options.expectJson=false] If true, configures the model to return a JSON response.
 * @param {import('fastify').FastifyLoggerInstance} [options.logger=console] A logger instance for structured logging.
 * @returns {Promise<string>} The raw text response from the model.
 * @throws {Error} If the API call fails after all retries.
 */
export async function callGemini(prompt, { modelName = 'gemini-2.5-pro-latest', expectJson = false, logger = console } = {}) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const generationConfig = {
        temperature: 0.5,
        ...(expectJson && { responseMimeType: 'application/json' }),
      };

      const model = genAI.getGenerativeModel(modelName, {
        safetySettings,
        generationConfig,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return response.text();

    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      const logContext = { attempt, maxRetries: MAX_RETRIES, modelName, error: error.message };

      if (isLastAttempt) {
        logger.error(logContext, "Gemini API call failed on the final attempt.");
        throw new Error(`Gemini API call to ${modelName} failed after ${MAX_RETRIES} attempts.`, { cause: error });
      }

      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      logger.warn(logContext, `Gemini API call failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
