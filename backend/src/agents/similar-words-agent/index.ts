import { SimilarWordsResult, SimilarWordsResultType } from './schemas';
import * as fs from 'fs';
import * as path from 'path';
import { generativeAIService } from '../../services/ai';

const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export async function getSimilarWords(prompt: string): Promise<SimilarWordsResultType> {
  console.log('SimilarWordsAgent: Sending prompt to AI service:', prompt);
  console.log('SimilarWordsAgent: Using system prompt:', promptContent);
  const resultText = await generativeAIService.generateText({ prompt, systemPrompt: promptContent });
  console.log('SimilarWordsAgent: Received raw result from AI service:', resultText);
  try {
    const parsedResult = JSON.parse(resultText);
    console.log('SimilarWordsAgent: Successfully parsed result:', parsedResult);
    return parsedResult;
  } catch (e) {
    console.error('SimilarWordsAgent: Failed to parse similar words result from AI service. Raw text:', resultText, 'Error:', e);
    return { synonyms: [], interchangeable_words: [] };
  }
}
