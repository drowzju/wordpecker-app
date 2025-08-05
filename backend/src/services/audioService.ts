import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import { getUserLanguages } from '../utils/getUserLanguages';
import { textToSpeechQwen } from './qwen'; // Import our new Qwen TTS function

// These interfaces are compatible with the existing routes
export interface VoiceConfig {
  id: string;
  name:string;
  language: string;
  category: string;
}

export interface AudioGenerationRequest {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  userId?: string;
}

export interface AudioGenerationResponse {
  audioUrl: string;
  cacheKey: string;
  voice: string;
  duration?: number;
}



class AudioService {
  private cacheDir: string;

  // Qwen voices from the documentation. We map them by language for selection.
  private qwenVoices: Record<string, { id: string; name: string }[]> = {
    zh: [
      { id: 'aixia', name: 'Aixia' },
      { id: 'xiaoyun', name: 'Xiaoyun' },
      { id: 'aida', name: 'Aida' },
      { id: 'zhaodi', name: 'Zhaodi' },
      { id: 'zhiyan', name: 'Zhiyan' },
      { id: 'zhixia', name: 'Zhixia' },
    ],
    en: [
      { id: 'Cherry', name: 'Cherry' },
      { id: 'Ethan', name: 'Ethan' },
      { id: 'Serena', name: 'Serena' },
      { id: 'Chelsie', name: 'Chelsie' },
    ],
    // Add other languages if specific voices are preferred
  };

  constructor() {
    // --- Re-used Caching Logic ---
    this.cacheDir = path.join(process.cwd(), 'audio-cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private generateCacheKey(text: string, voice: string, speed: number): string {
    const content = `qwen-${text}-${voice}-${speed}`; // Add a prefix to avoid collision with old cache
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private getCachedFilePath(cacheKey: string): string {
    return path.join(this.cacheDir, `${cacheKey}.mp3`);
  }

  private isAudioCached(cacheKey: string): boolean {
    const filePath = this.getCachedFilePath(cacheKey);
    return fs.existsSync(filePath);
  }
  
  public getCachedAudio(cacheKey: string): Buffer | null {
    const filePath = this.getCachedFilePath(cacheKey);
    if (!this.isAudioCached(cacheKey)) {
      return null;
    }
    try {
      return fs.readFileSync(filePath);
    } catch (error) {
      console.error('Error reading cached audio:', error);
      return null;
    }
  }
  // --- End of Re-used Caching Logic ---

  private async determineTargetLanguage(request: AudioGenerationRequest): Promise<string> {
    if (request.language) {
      return request.language;
    }
    if (request.userId) {
      try {
        const userLanguages = await getUserLanguages(request.userId);
        return userLanguages.targetLanguage;
      } catch (error) {
        console.warn(`Failed to get user languages for ${request.userId}:`, error);
      }
    }
    return 'en'; // Default to English
  }

  private getBestVoiceForLanguage(language: string, requestedVoice?: string): string {
    if (requestedVoice && Object.values(this.qwenVoices).flat().some(v => v.id === requestedVoice)) {
      return requestedVoice;
    }
    const voicesForLang = this.qwenVoices[language] || this.qwenVoices['en'];
    return voicesForLang[0].id; // Return the first available voice for the language
  }

  public async generateAudio(request: AudioGenerationRequest): Promise<AudioGenerationResponse> {
    const { text, voice: requestedVoice } = request;
    const speed = request.speed || 1.0; // Qwen speed is a different parameter, not directly used in the call but in cache key

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for audio generation');
    }

    const language = await this.determineTargetLanguage(request);
    const voice = this.getBestVoiceForLanguage(language, requestedVoice);
    const cacheKey = this.generateCacheKey(text, voice, speed);
    const filePath = this.getCachedFilePath(cacheKey);

    if (this.isAudioCached(cacheKey)) {
      console.log(`Qwen audio served from cache: ${cacheKey} (${language})`);
      return {
        audioUrl: `/api/audio/cache/${cacheKey}`,
        cacheKey,
        voice,
      };
    }

    try {
      console.log(`Generating Qwen ${language} audio: "${text.substring(0, 50)}..." with voice ${voice}`);
      
      // 1. Call our Qwen TTS service to get the audio stream
      const audioStream = await textToSpeechQwen(text, voice);

      // 2. Save the stream to the cache file
      const writer = fs.createWriteStream(filePath);
      await pipeline(audioStream, writer); // Use promise-based pipeline

      console.log(`Qwen audio generated and cached: ${cacheKey}`);

      return {
        audioUrl: `/api/audio/cache/${cacheKey}`,
        cacheKey,
        voice,
      };
    } catch (error) {
      console.error('Qwen TTS generation or caching error:', error);
      throw new Error('Failed to generate audio from Qwen service.');
    }
  }

  public async getAvailableVoices(language?: string): Promise<VoiceConfig[]> {
    let voices = Object.entries(this.qwenVoices).flatMap(([lang, voiceList]) => 
      voiceList.map(v => ({
        id: v.id,
        name: `${v.name} (${lang.toUpperCase()})`,
        language: lang,
        category: 'standard'
      }))
    );

    if (language) {
      voices = voices.filter(v => v.language === language);
    }

    return voices;
  }
}

export const audioService = new AudioService();
