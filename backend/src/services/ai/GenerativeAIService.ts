// backend/src/services/ai/GenerativeAIService.ts

export interface TextGenerationOptions {
  systemPrompt?: string;
  prompt: string;
  // Future options can be added here, e.g., temperature, max_tokens
}

export interface ImageAnalysisOptions {
  prompt: string;
  imageUrl: string;
}

export interface ImageGenerationOptions {
  prompt: string;
  size?: '1024*1024' | '720*1280' | '1280*720';
  n?: number;
}

/**
 * Defines the standard interface for a generative AI service.
 * This abstraction allows swapping different AI providers (like OpenAI, Qwen)
 * without changing the agent-level code.
 */
export interface IGenerativeAI {
  /**
   * Generates text content based on a prompt.
   * @param options - The options for text generation.
   * @returns A promise that resolves to the generated text.
   */
  generateText(options: TextGenerationOptions): Promise<string>;

  /**
   * Generates content (text and/or image) based on a prompt.
   * @param options - The options for content generation.
   * @returns A promise that resolves to the generated content as a string.
   */
  generateContent(options: { prompt: string; imageUrl?: string; systemPrompt?: string }): Promise<string>;

  /**
   * Analyzes an image and returns a textual description or answer.
   * @param options - The options for image analysis.
   * @returns A promise that resolves to the analysis result.
   */
  analyzeImage(options: ImageAnalysisOptions): Promise<string>;

  /**
   * Generates an image based on a textual prompt.
   * @param options - The options for image generation.
   * @returns A promise that resolves to an array of generated image objects, containing URLs.
   */
  generateImage(options: ImageGenerationOptions): Promise<{ url: string }[]>;
}
