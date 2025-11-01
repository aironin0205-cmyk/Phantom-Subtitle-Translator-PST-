// ===== IMPORTS & DEPENDENCIES =====
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// ===== CONFIGURATION & CONSTANTS =====
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 200;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("FATAL ERROR: GEMINI_API_KEY environment variable is not set.");
}

const genAI = new GoogleGenerativeAI(apiKey);

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
 * @param {string} [options.modelName='gemini-2.5-pro-latest'] The model to use.
 * @param {boolean} [options.expectJson=false] If true, configures the model to return JSON.
 * @param {import('fastify').FastifyLoggerInstance} [options.logger=console] A logger instance.
 * @returns {Promise<string>} The raw text response from the model.
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
