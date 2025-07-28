import { ReadingResult, ReadingResultType } from './schemas';
import * as fs from 'fs';
import * as path from 'path';
import { generativeAIService } from '../../services/ai';

const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export async function getReading(prompt: string): Promise<ReadingResultType> {
  const resultText = await generativeAIService.generateText({ prompt, systemPrompt: promptContent });
  try {
    return JSON.parse(resultText);
  } catch (e) {
    console.error('Failed to parse reading result from AI service.', e);
    return { title: 'Error', text: 'Failed to generate reading passage.', highlighted_words: [], word_count: 0, difficulty_level: 'unknown', theme: 'error' };
  }
}