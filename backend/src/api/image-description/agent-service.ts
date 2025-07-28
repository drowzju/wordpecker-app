import { ImageGenerationResultType } from '../../agents/image-generation-agent/schemas';
import { ImageAnalysisResultType } from '../../agents/image-analysis-agent/schemas';
import { ContextualImageResultType } from '../../agents/contextual-image-agent/schemas';
import { getImageAnalysis, getImageGeneration, getContextualImage } from '../../agents';
import { generativeAIService } from '../../services/ai';
import * as fs from 'fs';
import * as path from 'path';

const contextualImagePromptPath = path.join(__dirname, '..', '..', 'agents', 'contextual-image-agent', 'prompt.md');
const contextualImageSystemPrompt = fs.readFileSync(contextualImagePromptPath, 'utf-8');

const imageGenerationPromptPath = path.join(__dirname, '..', '..', 'agents', 'image-generation-agent', 'prompt.md');
const imageGenerationSystemPrompt = fs.readFileSync(imageGenerationPromptPath, 'utf-8');

const imageAnalysisPromptPath = path.join(__dirname, '..', '..', 'agents', 'image-analysis-agent', 'prompt.md');
const imageAnalysisSystemPrompt = fs.readFileSync(imageAnalysisPromptPath, 'utf-8');


export class ImageDescriptionAgentService {
  async generateContext(): Promise<string> {
    const topics = [
      'business meetings', 'cooking recipes', 'space exploration', 'medieval history', 'street market',
      'art gallery', 'ocean wildlife', 'mountain hiking', 'city nightlife', 'farm animals',
      'technology trends', 'fashion design', 'sports events', 'music festival', 'library study',
      'beach vacation', 'winter sports', 'garden plants', 'car mechanics', 'hospital care',
      'restaurant dining', 'school classroom', 'airport travel', 'construction site', 'wedding ceremony',
      'scientific research', 'cultural festival', 'fitness gym', 'pet care', 'home renovation',
      'photography studio', 'dance performance', 'board games', 'camping trip', 'coffee shop',
      'weather patterns', 'ancient civilizations', 'modern architecture', 'wildlife safari', 'theater production'
    ];
    
    // Add randomness with current time to ensure different results
    const randomSeed = Date.now() + Math.random();
    const randomIndex = Math.floor(randomSeed % topics.length);
    const selectedTopic = topics[randomIndex];
    
    const prompt = `Generate a vocabulary learning context similar to "${selectedTopic}" but different. Create a simple, clear topic (2-4 words maximum). Be creative and avoid repeating the same topics.`;
    const resultText = await generativeAIService.generateText({ prompt, systemPrompt: contextualImageSystemPrompt });
    // Extract JSON from markdown code block if present
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = resultText;
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }
    const result = JSON.parse(jsonString) as ContextualImageResultType;
    return result.searchQuery || result.enhancedContext || selectedTopic;
  }

  async generateAIImage(context: string, sessionId: string): Promise<ImageGenerationResultType> {
    const imagePrompt = `Generate an AI image for the context "${context}" with session ID ${sessionId}`;
    const resultText = await generativeAIService.generateText({ prompt: imagePrompt, systemPrompt: imageGenerationSystemPrompt });
    const imageResponse = JSON.parse(resultText) as ImageGenerationResultType;
    return imageResponse;
  }

  async analyzeDescription(userDescription: string, imageUrl: string, context: string, baseLanguage: string, targetLanguage: string): Promise<ImageAnalysisResultType> {
    const analysisPrompt = `Analyze this image and user description:

User Description: "${userDescription.trim()}"
Context: ${context}
Base Language: ${baseLanguage}
Target Language: ${targetLanguage}

Examine the image carefully and provide vocabulary improvement suggestions.`;
    
    const resultText = await generativeAIService.generateContent({
      prompt: analysisPrompt,
      systemPrompt: imageAnalysisSystemPrompt,
      imageUrl: imageUrl
    });
    const analysis = JSON.parse(resultText) as ImageAnalysisResultType;
    return analysis;
  }
}

export const imageDescriptionAgentService = new ImageDescriptionAgentService();