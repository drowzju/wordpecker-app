import { environment } from '../../config/environment';
import { IGenerativeAI } from './GenerativeAIService';
import { QwenAIService } from './QwenAIService';
import { OpenAIAIService } from './OpenAIAIService';

let generativeAIService: IGenerativeAI;

console.log(`Initializing AI Service with provider: ${environment.aiProvider}`);

if (environment.aiProvider === 'qwen') {
  try {
    generativeAIService = new QwenAIService();
    console.log('Qwen AI Service initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Qwen AI Service:', error);
    process.exit(1);
  }
} else if (environment.aiProvider === 'openai') {
  try {
    generativeAIService = new OpenAIAIService();
    console.log('OpenAI AI Service initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize OpenAI AI Service:', error);
    process.exit(1);
  }
} else {
  console.error(`Invalid AI provider specified: "${environment.aiProvider}". Please use 'openai' or 'qwen'.`);
  process.exit(1);
}

export { generativeAIService };
