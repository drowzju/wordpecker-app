import { ExerciseResultType } from './schemas';
import * as fs from 'fs';
import * as path from 'path';
import { generativeAIService } from '../../services/ai';

const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export async function getExercises(prompt: string): Promise<ExerciseResultType> {
  const resultText = await generativeAIService.generateText({ prompt, systemPrompt: promptContent });
  try {
    return JSON.parse(resultText);
  } catch (e) {
    console.error('Failed to parse exercise result from AI service.', e);
    return { exercises: [] };
  }
}