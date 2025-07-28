import OpenAI from 'openai';
import { environment } from '../../config/environment';
import { IGenerativeAI, ImageAnalysisOptions, ImageGenerationOptions, TextGenerationOptions } from './GenerativeAIService';

/**
 * Implements the IGenerativeAI interface using OpenAI's models.
 */
export class OpenAIAIService implements IGenerativeAI {
  private client: OpenAI;

  constructor() {
    if (!environment.openaiApiKey) {
      throw new Error('OpenAI API key is missing. Please set OPENAI_API_KEY in your environment variables.');
    }
    this.client = new OpenAI({ apiKey: environment.openaiApiKey });
  }

  async generateText(options: TextGenerationOptions): Promise<string> {
    return this.generateContent({ prompt: options.prompt, systemPrompt: options.systemPrompt });
  }

  async generateContent(options: { prompt: string; imageUrl?: string; systemPrompt?: string }): Promise<string> {
    const messages: any[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    if (options.imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: options.prompt },
          { type: 'image_url', image_url: { url: options.imageUrl } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: options.prompt });
    }

    const model = options.imageUrl ? 'gpt-4-vision-preview' : 'gpt-4-turbo';

    try {
      const response = await this.client.chat.completions.create({
        model: model,
        messages: messages,
      });
      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating content with OpenAI:', error);
      throw new Error('Failed to generate content with OpenAI.');
    }
  }

  async analyzeImage(options: ImageAnalysisOptions): Promise<string> {
    return this.generateContent({ prompt: options.prompt, imageUrl: options.imageUrl });
  }

  async generateImage(options: ImageGenerationOptions): Promise<{ url: string }[]> {
    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: options.prompt,
        n: options.n || 1,
        size: (options.size?.replace('*', 'x') as any) || '1024x1024',
      });
      if (response.data) {
        return response.data.map(item => ({ url: item.url || '' }));
      }
      return [];
    } catch (error) {
      console.error('Error generating image with OpenAI:', error);
      throw new Error('Failed to generate image with OpenAI.');
    }
  }
}
