import { ImageAnalysisResult, ImageAnalysisResultType } from './schemas';
import * as fs from 'fs';
import * as path from 'path';
import { generativeAIService } from '../../services/ai';

// Load prompt from markdown file
const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export async function getImageAnalysis(prompt: string, imageUrl: string): Promise<ImageAnalysisResultType> {
  const analysisResultText = await generativeAIService.analyzeImage({
    prompt: prompt,
    imageUrl: imageUrl,
  });

  try {
    const parsedResult = JSON.parse(analysisResultText);
    return parsedResult;
  } catch (e) {
    console.error('Failed to parse analysis result from AI service. Returning raw text.', e);
    return { corrected_description: 'Could not parse response', feedback: '', recommendations: [], user_strengths: [], missed_concepts: [] };
  }
}
