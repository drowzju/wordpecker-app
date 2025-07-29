import { ExamplesResult, ExamplesResultType } from './schemas';
import * as fs from 'fs';
import * as path from 'path';
import { generativeAIService } from '../../services/ai';

const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export async function getExamples(prompt: string): Promise<ExamplesResultType> {
  const resultText = await generativeAIService.generateText({ prompt, systemPrompt: promptContent });
  try {
    // Extract JSON from markdown code block if present
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = resultText;
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse examples result from AI service.', e);
    return { examples: [] };
  }
}