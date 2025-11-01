import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini client with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define standard safety settings to be reused by all API calls.
// This is a professional practice to ensure consistent behavior.
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
        // If we expect a JSON object, we tell the model to output it in that format.
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
    // This ensures that if the API call fails, our application has a clear error to handle.
    throw new Error("Failed to communicate with the Gemini API.");
  }
}
