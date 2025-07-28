import { IGenerativeAI, ImageAnalysisOptions, ImageGenerationOptions, TextGenerationOptions } from './GenerativeAIService';
import { aiBaseUrl } from '../../app'; // Import aiBaseUrl from app.ts
import { environment } from '../../config/environment';

/**
 * Implements the IGenerativeAI interface using Alibaba's Qwen (Dashscope) models.
 */
export class QwenAIService implements IGenerativeAI {

  constructor() {
    if (!environment.dashscopeApiKey) {
      throw new Error('Dashscope API key is missing. Please set DASHSCOPE_API_KEY in your environment variables.');
    }
  }

  /**
   * Generates text using a Qwen chat model.
   * @param options - The options for text generation.
   * @returns The generated text content.
   */
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
          { text: options.prompt },
          { image: options.imageUrl }
        ]
      });
    } else {
      messages.push({ role: 'user', content: options.prompt });
    }

    const model = options.imageUrl ? 'qwen-vl-plus' : 'qwen-plus'; // Use multimodal model if image is present
    const endpoint = options.imageUrl ? 'multimodal_chat/completions' : 'chat/completions';

    try {
      const response = await fetch(`${aiBaseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${environment.dashscopeApiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Qwen API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('No response body from Qwen API.');
      }

      let fullContent = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const jsonStr = line.substring(5).trim();
            if (jsonStr === '[DONE]') {
              break;
            }
            try {
              const data = JSON.parse(jsonStr);
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                fullContent += data.choices[0].delta.content;
              }
            } catch (e) {
              console.warn('Failed to parse JSON from Qwen stream:', jsonStr, e);
            }
          }
        }
      }
      
      if (fullContent) {
        return fullContent;
      }
      throw new Error('Received no valid content from Qwen API.');
    } catch (error) {
      console.error('Error generating content with Qwen:', error);
      throw new Error('Failed to generate content with Qwen.');
    }
  }

  async analyzeImage(options: ImageAnalysisOptions): Promise<string> {
    return this.generateContent({ prompt: options.prompt, imageUrl: options.imageUrl });
  }

  /**
   * Generates an image using the Wanx model.
   * @param options - The options for image generation.
   * @returns An array of generated image objects with URLs.
   */
  async generateImage(options: ImageGenerationOptions): Promise<{ url: string }[]> {
    // TODO: Implement correct API call for Qwen image generation
    console.warn('generateImage not yet implemented for QwenAIService.');
    throw new Error('generateImage not implemented for QwenAIService.');
  }
}
