// ===== DEVELOPMENT/DEBUG CENTRALIZED CONFIGURATION =====
// This version uses Zod to create a declarative, type-safe, and self-documenting
// configuration system. It's more robust and maintainable than manual validation.

// ===== IMPORTS & DEPENDENCIES =====
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from a .env file into process.env
dotenv.config();

// ===== CONFIGURATION SCHEMA (THE "SINGLE SOURCE OF TRUTH") =====
// Here, we define the entire "shape" of our application's environment.
// Zod handles type coercion (e.g., string to number), default values, and validation.
const configSchema = z.object({
  // --- Application Environment ---
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // --- Server Configuration ---
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3001), // `coerce` automatically converts string to number

  // --- Security Configuration ---
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60 * 1000),

  // --- Database & External Services ---
  // For required secrets, we use `.string().min(1)` to ensure they are not empty.
  // We avoid `.default()` because the app should fail if these aren't provided.
  MONGO_URI: z.string().min(1, 'MONGO_URI is a required environment variable.'),
  PINECONE_API_KEY: z.string().min(1, 'PINECONE_API_KEY is a required environment variable.'),
  PINECONE_INDEX_NAME: z.string().default('pst-translations'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is a required environment variable.'),

  // --- Gemini Model & Retry Configuration ---
  GEMINI_BLUEPRINT_MODEL: z.string().default('gemini-1.5-pro-latest'),
  GEMINI_TRANSLATION_MODEL: z.string().default('gemini-1.5-pro-latest'),
  GEMINI_SYNC_MODEL: z.string().default('gemini-1.5-flash-latest'),
  GEMINI_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  GEMINI_BACKOFF_MS: z.coerce.number().int().positive().default(200),

  // --- Observability ---
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

// ===== VALIDATION & EXPORT =====
// We use `safeParse` to attempt validation. If it fails, it returns an `error` object
// instead of throwing, allowing us to format a clean and helpful error message.
const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
  // The logger is not available yet, so we use console.error.
  console.error(
    '❌ Invalid environment variables:',
    // `format()` provides a human-readable list of errors.
    parsedConfig.error.format()
  );
  // Exit the process with a failure code to prevent a broken startup.
  // This is a critical safeguard for all environments.
  process.exit(1);
}

// Export the successfully parsed and typed configuration object.
// This `config` object is now fully validated and type-safe.
const config = parsedConfig.data;
export default config;
