import dotenv from 'dotenv';
dotenv.config();

import { environment } from './config/environment'; // Import environment early

let aiBaseUrl: string;

// --- START: Moved from backend/src/agents/config.ts to ensure early environment variable setting ---
if (environment.aiProvider === 'qwen') {
  const apiKey = environment.dashscopeApiKey;
  const baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  if (!apiKey) {
    console.error('Error: DASHSCOPE_API_KEY environment variable is required when using the "qwen" provider.');
    process.exit(1);
  }
  process.env.OPENAI_API_KEY = apiKey;
  process.env.OPENAI_BASE_URL = baseURL;
  aiBaseUrl = baseURL;
  console.log(`Early config: Using Qwen endpoint: ${baseURL}`);
} else { // Default to 'openai'
  const apiKey = environment.openaiApiKey;
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is required when using the "openai" provider.');
    process.exit(1);
  }
  process.env.OPENAI_API_KEY = apiKey;
  process.env.OPENAI_BASE_URL = environment.openaiBaseUrl || 'https://api.openai.com/v1';
  aiBaseUrl = environment.openaiBaseUrl || 'https://api.openai.com/v1';
  console.log(`Early config: Using OpenAI endpoint: ${process.env.OPENAI_BASE_URL}`);
}
// --- END: Moved from backend/src/agents/config.ts ---

export { aiBaseUrl }; // Export the determined AI base URL

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { openaiRateLimiter } from './middleware/rateLimiter';
import { connectDB } from './config/mongodb';
import { startCacheCleanupJob } from './services/cacheManager';


// Import routes
import listRoutes from './api/lists/routes';
import wordRoutes from './api/words/routes';
import learnRoutes from './api/learn/routes';
import quizRoutes from './api/quiz/routes';
import templateRoutes from './api/templates/routes';
import preferencesRoutes from './api/preferences/routes';

import vocabularyRoutes from './api/vocabulary/routes';
import languageValidationRoutes from './api/language-validation/routes';
import audioRoutes from './api/audio/routes';


const app = express();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Apply rate limiter only to OpenAI-powered routes
app.use('/api/learn', openaiRateLimiter);
app.use('/api/quiz', openaiRateLimiter);

app.use('/api/vocabulary', openaiRateLimiter);
app.use('/api/language-validation', openaiRateLimiter);
app.use('/api/audio', openaiRateLimiter); // Audio routes use ElevenLabs API


// Routes
app.use('/api/lists', listRoutes);
app.use('/api/lists', wordRoutes);
app.use('/api/learn', learnRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/preferences', preferencesRoutes);

app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/language-validation', languageValidationRoutes);
app.use('/api/audio', audioRoutes);


// Error handling
app.use(errorHandler);

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = environment.port;
  
  // Configure OpenAI agents and connect to MongoDB
  Promise.all([
    connectDB()
  ]).then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${environment.nodeEnv} mode`);
      // Start the cache cleanup job
      startCacheCleanupJob();
    });
  }).catch(error => {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  });
}

export default app; 