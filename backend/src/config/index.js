// ===== PRODUCTION-READY CENTRALIZED CONFIGURATION =====
// This file is the single source of truth for all configuration in the application.
// It loads environment variables, provides defaults, and validates their presence.

import dotenv from 'dotenv';

// Load environment variables from a .env file into process.env for local development.
dotenv.config();

const config = {
  // --- Application Environment ---
  NODE_ENV: process.env.NODE_ENV || 'development',

  // --- Server Configuration ---
  HOST: process.env.HOST || '0.0.0.0', // Essential for containerized environments
  PORT: parseInt(process.env.PORT, 10) || 3001,

  // --- Security Configuration ---
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000, // 1 minute

  // --- Database & External Services ---

  // MongoDB
  MONGO_URI: process.env.MONGO_URI,

  // Pinecone
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || 'pst-translations',

  // Google Gemini
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  // Specific models for different tasks allow for fine-tuning performance and cost.
  GEMINI_BLUEPRINT_MODEL: process.env.GEMINI_BLUEPRINT_MODEL || 'gemini-2.5-pro-latest',
  GEMINI_TRANSLATION_MODEL: process.env.GEMINI_TRANSLATION_MODEL || 'gemini-2.5-pro-latest',
  GEMINI_SYNC_MODEL: process.env.GEMINI_SYNC_MODEL || 'gemini-2.5-flash-latest',
  // Retry logic configuration
  GEMINI_MAX_RETRIES: parseInt(process.env.GEMINI_MAX_RETRIES, 10) || 3,
  GEMINI_BACKOFF_MS: parseInt(process.env.GEMINI_BACKOFF_MS, 10) || 200,

  // --- Observability ---
  LOG_LEVEL: process.env.LOG_LEVEL || 'info', // e.g., 'debug', 'info', 'warn', 'error'
};

// ===== Environment Validation =====
// This is a critical production safeguard. It ensures the application fails fast
// if it's started in a production-like environment without the necessary secrets.
const requiredConfig = [
  'MONGO_URI', 
  'PINECONE_API_KEY', 
  'PINECONE_INDEX_NAME', 
  'GEMINI_API_KEY'
];

if (config.NODE_ENV !== 'development') {
  for (const key of requiredConfig) {
    if (!config[key]) {
      // Use console.error because the logger may not be initialized yet.
      console.error(`FATAL ERROR: Required environment variable "${key}" is not set.`);
      process.exit(1); // Exit with a failure code to prevent a broken startup.
    }
  }
}

export default config;
