import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import { getUserLanguages } from '../utils/getUserLanguages';
import { textToSpeechQwen } from './qwen'; // Import our new Qwen TTS function
import { Response } from 'express';
import { Word, IWord } from '../api/words/model';
import { Dictionary } from '../api/dictionary/model';
import ffmpeg from 'fluent-ffmpeg';
import { execFile } from 'child_process';


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
    const content = `qwen-${text}-${voice}-${speed}`;
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
    const speed = request.speed || 1.0;

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
      console.log(`Generating Qwen ${language} audio: "${text.substring(0, 50)}"... with voice ${voice}`);
      
      const audioStream = await textToSpeechQwen(text, voice);

      const writer = fs.createWriteStream(filePath);
      await pipeline(audioStream, writer);

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

  private extractAudioUrl(dictionaryData: any): string | null {
    if (!dictionaryData || !Array.isArray(dictionaryData)) {
      return null;
    }

    for (const entry of dictionaryData) {
      if (entry.phonetics && Array.isArray(entry.phonetics)) {
        for (const phonetic of entry.phonetics) {
          if (phonetic.audio && typeof phonetic.audio === 'string' && phonetic.audio.startsWith('http')) {
            return phonetic.audio;
          }
        }
      }
      // Check for nested dictionary structure
      if (entry.dictionary) {
        const nestedUrl = this.extractAudioUrl(entry.dictionary);
        if (nestedUrl) {
          return nestedUrl;
        }
      }
    }

    return null;
  }

  public async generatePronunciationAudioForList(listId: string, listName: string, res: Response) {
    // 1. Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendProgress = (progress: number, message: string, data?: any) => {
        const eventData = JSON.stringify({ progress, message, ...data });
        res.write(`data: ${eventData}\n\n`);
    };

    const tempDir = path.join(this.cacheDir, `temp_${listId}_${Date.now()}`);

    try {
        const words: IWord[] = await Word.find({ 'ownedByLists.listId': listId });
        if (words.length === 0) {
            throw new Error('This list has no words.');
        }
        sendProgress(5, `Found ${words.length} words. Fetching pronunciation URLs...`);

        const audioUrls: {word: string, url: string}[] = [];
        for (const word of words) {
            console.log(`Processing word: "${word.value}"`); // LOG: Start processing word
            // Use a case-insensitive regular expression for the dictionary lookup
            const entry = await Dictionary.findOne({ word: new RegExp(`^${word.value}$`, 'i') });

            if (!entry) {
                console.log(`  -> Dictionary entry not found.`); // LOG: Entry not found
                continue;
            }

            const foundAudioUrl = this.extractAudioUrl(entry.dictionary);

            if (foundAudioUrl) {
                audioUrls.push({word: word.value, url: foundAudioUrl});
                console.log(`  -> SUCCESS: Found audio URL: ${foundAudioUrl}`); // LOG: Success
            } else {
                // LOG: Failure - log the entire dictionary object for debugging
                console.log(`  -> FAIL: Audio URL not found. Dictionary object:`, JSON.stringify(entry.dictionary, null, 2));
            }
        }
        sendProgress(20, `Found ${audioUrls.length} pronunciation files. Downloading...`);

        fs.mkdirSync(tempDir, { recursive: true });

        const downloadedFiles: string[] = [];
        for (let i = 0; i < audioUrls.length; i++) {
            const item = audioUrls[i];
            const filePath = path.join(tempDir, `${i}.mp3`);
            try {
                // Using curl directly as the final and most reliable method.
                await new Promise<void>((resolve, reject) => {
                    execFile('curl', ['-L', '-o', filePath, item.url], (error, stdout, stderr) => {
                        if (error) {
                            reject(new Error(`curl failed for ${item.url}: ${stderr || error.message}`));
                            return;
                        }
                        resolve();
                    });
                });
                downloadedFiles.push(filePath);
                sendProgress(20 + Math.round((i / audioUrls.length) * 40), `Downloaded (${i + 1}/${audioUrls.length}): ${item.word}`);
            } catch (downloadError) {
                console.warn(`Failed to download ${item.url}`, downloadError);
                sendProgress(20 + Math.round((i / audioUrls.length) * 40), `Failed to download: ${item.word}`);
            }
        }

        if (downloadedFiles.length === 0) {
            throw new Error('No valid pronunciation files could be downloaded.');
        }

        sendProgress(60, 'All files downloaded. Combining audio, this may take a moment...');
        // Sanitize the list name to create a valid filename
        const sanitizedListName = listName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        const outputFileName = `${sanitizedListName}_pronunciations.mp3`;
        const outputFilePath = path.join(this.cacheDir, outputFileName);
        
        const command = ffmpeg();
        // Use the user-provided silent audio file.
        const silenceFile = path.resolve(__dirname, '../assets/1-second-of-silence.mp3');

        if (!fs.existsSync(silenceFile)) {
            throw new Error(`Silent audio file not found at ${silenceFile}`);
        }

        downloadedFiles.forEach((file: string) => {
            command.input(file).input(silenceFile).input(file).input(silenceFile).input(file).input(silenceFile);
        });

        await new Promise<void>((resolve, reject) => {
            command
                .on('end', () => {
                    sendProgress(100, 'Audio combination complete!', { downloadUrl: `/api/audio/download/${outputFileName}` });
                    resolve();
                })
                .on('error', (err) => reject(new Error('FFmpeg error: ' + err.message)))
                .mergeToFile(outputFilePath, tempDir);
        });

    } catch (error: any) {
        console.error('Error generating pronunciation audio:', error);
        sendProgress(100, `Error: ${error.message}`, { error: true });
        res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
    } finally {
        if (fs.existsSync(tempDir)) {
            fs.rm(tempDir, { recursive: true, force: true }, () => {});
        }
        res.end();
    }
  }
}

export const audioService = new AudioService();
