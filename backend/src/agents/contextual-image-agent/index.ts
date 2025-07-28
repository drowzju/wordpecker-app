import { ContextualImageResult, ContextualImageResultType } from './schemas';
import * as fs from 'fs';
import * as path from 'path';
import { generativeAIService } from '../../services/ai';

const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export async function getContextualImage(prompt: string): Promise<ContextualImageResultType> {
  const resultText = await generativeAIService.generateText({ prompt, systemPrompt: promptContent });
  try {
    return JSON.parse(resultText);
  } catch (e) {
    console.error('Failed to parse contextual image result from AI service.', e);
    return { searchQuery: 'error', enhancedContext: 'error' };
  }
}