declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      NODE_ENV: 'development' | 'production' | 'test';
      OPENAI_API_KEY: string;
      OPENAI_BASE_URL?: string;
      MONGODB_URL: string;
      DASHSCOPE_API_KEY?: string;
    }
  }
}

export {}; 