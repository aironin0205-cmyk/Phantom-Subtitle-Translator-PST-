// ===== CENTRALIZED CONFIGURATION =====

import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Application Environment
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Server Configuration
  HOST: process.env.HOST || '0.0.0.0',
  PORT: parseInt(process.env.PORT, 10) || 3001,

  // CORS Configuration
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Rate Limiting
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000,

  // Database Configurations
  MONGO_URI: process.env.MONGO_URI,

  // External Service API Keys
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// --- Environment Validation ---
const requiredSecrets = ['MONGO_URI', 'PINECONE_API_KEY', 'GEMINI_API_KEY'];
if (config.NODE_ENV !== 'development') {
  for (const secret of requiredSecrets) {
    if (!config[secret]) {
      console.error(`FATAL ERROR: Environment variable ${secret} is not defined.`);
      process.exit(1);
    }
  }
}

export default config;
