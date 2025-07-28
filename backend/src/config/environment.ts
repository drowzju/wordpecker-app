

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URL'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const environment = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  mongodbUrl: process.env.MONGODB_URL!,
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY,
  aiProvider: process.env.AI_PROVIDER || 'openai'
} as const; 