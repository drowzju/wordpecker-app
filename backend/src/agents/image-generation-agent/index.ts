import { ImageGenerationResultType } from './schemas';
import * as fs from 'fs';
import * as path from 'path';
import { generateImageWithAI } from './tools/generateAiImage';

const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export async function getImageGeneration(context: string, sessionId: string): Promise<ImageGenerationResultType> {
  return await generateImageWithAI(context, sessionId);
}