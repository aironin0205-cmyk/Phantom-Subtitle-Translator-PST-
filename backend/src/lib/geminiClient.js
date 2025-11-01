import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// --- ROBUST API KEY CHECK (THE FIX) ---
// Get the key from the environment.
const apiKey = process.env.GEMINI_API_KEY;

// Check if the key is missing. If so, throw an immediate, clear error.
// This will provide a much better error message in the logs than a generic crash.
if (!apiKey) {
  throw new Error("FATAL ERROR: GEMINI_API_KEY environment variable is not set. The application cannot start.");
}
// ---

// Initialize the Gemini client with the validated API key
const genAI = new GoogleGenerativeAI(apiKey);

// Define standard safety settings
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

/**
 * A robust, centralized function for calling the Gemini Pro model.
 * @param {string} prompt The complete, engineered prompt to send to the model.
 * @param {boolean} expectJson If true, configures the model to return a JSON response.
 * @returns {Promise<string>} The raw text response from the model.
 */
export async function callGemini(prompt, expectJson = false) {
  try {
    const modelConfig = {
      model: "gemini-1.5-pro-latest",
      generationConfig: {
        temperature: 0.5,
        ...(expectJson && { responseMimeType: 'application/json' }),
      },
      safetySettings,
    };

    const model = genAI.getGenerativeModel(modelConfig);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text();

  } catch (error) {
    console.error("Gemini API Call Error:", error);
    throw new Error("Failed to communicate with the Gemini API.");
  }
}
