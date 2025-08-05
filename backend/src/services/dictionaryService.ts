import puppeteer from 'puppeteer';
import axios from 'axios';
import { Dictionary } from '../api/dictionary/model';
import { environment } from '../config/environment';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { wrapper } from 'axios-cookiejar-support';

// Internal data structure
export interface Phonetic {
  text?: string;
  audio?: string;
}

export interface Definition {
  definition: string;
  example?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}

export interface DictionaryEntry {
  word: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
}

// Merriam-Webster API response interfaces
interface MerriamWebsterEntry {
  meta: {
    id: string;
  };
  hwi: {
    hw: string;
    prs?: {
      mw: string;
      sound?: {
        audio: string;
      };
    }[];
  };
  fl: string; // functional label (part of speech)
  shortdef: string[];
}

// --- Data Transformation ---

// --- Audio Caching for Dictionary Service ---
async function cacheAudioFromUrl(audioUrl: string): Promise<string | null> {
  // No longer caching, just return the URL
  return audioUrl;
}

// --- Data Transformation ---

const transformMerriamWebsterResponse = async (data: MerriamWebsterEntry[], word: string): Promise<DictionaryEntry[] | null> => {
  if (!data || data.length === 0 || typeof data[0] !== 'object' || !data[0].hwi) {
    console.log(`No valid entries found for "${word}" from Merriam-Webster.`);
    return null;
  }

  const entry = data.find(e => e.meta.id.split(':')[0].toLowerCase() === word.toLowerCase());
  if (!entry) {
    console.log(`No exact match found for "${word}" from Merriam-Webster.`);
    return null;
  }
  
  const meanings: Meaning[] = data
    .filter(e => typeof e === 'object' && e.fl) // Filter out non-entry items
    .map(e => ({
      partOfSpeech: e.fl,
      definitions: e.shortdef.map(def => ({ definition: def })),
    }));

  const phonetics: Phonetic[] = [];
  if (entry.hwi?.prs?.length) {
    for (const pr of entry.hwi.prs) {
      const phonetic: Phonetic = { text: pr.mw };
      if (pr.sound?.audio) {
        const audioFile = pr.sound.audio;
        let subdirectory;
        if (audioFile.startsWith('bix')) {
          subdirectory = 'bix';
        } else if (audioFile.startsWith('gg')) {
          subdirectory = 'gg';
        } else if (audioFile.startsWith('_') || audioFile.startsWith('-')) {
          subdirectory = 'punct';
        } else if (/^[0-9]/.test(audioFile.charAt(0))) {
          subdirectory = 'number';
        } else {
          subdirectory = audioFile.charAt(0);
        }
        
        const cachedAudioUrl = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${audioFile}.mp3`;
        if (cachedAudioUrl) {
          phonetic.audio = cachedAudioUrl;
        }
      }
      phonetics.push(phonetic);
    }
  }

  return [{
    word: entry.hwi.hw.replace(/\*/g, ''),
    phonetics,
    meanings,
  }];
};

const transformMongoResponse = (doc: any): DictionaryEntry[] => {
    const meanings: Meaning[] = [];
    if (doc.entries && typeof doc.entries === 'object') {
        for (const partOfSpeech in doc.entries) {
            if (Object.prototype.hasOwnProperty.call(doc.entries, partOfSpeech)) {
                const definitions = doc.entries[partOfSpeech].map((def: string) => ({ definition: def }));
                meanings.push({ partOfSpeech, definitions });
            }
        }
    }
    return [{
        word: doc.word,
        phonetics: doc.phonetics || [],
        meanings,
    }];
};


// --- Database and API Logic ---

async function fetchFromMerriamWebster(word: string): Promise<DictionaryEntry[] | null> {
  if (!environment.merriamWebsterApiKey) {
    console.log('Merriam-Webster API key not configured.');
    return null;
  }
  
  const apiKey = environment.merriamWebsterApiKey;
  const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word.toLowerCase()}?key=${apiKey}`;
  
  console.log('Fetching definition from Merriam-Webster for:', word);

  try {
    const response = await axios.get<MerriamWebsterEntry[]>(url, { proxy: false });
    if (response.status !== 200 || !response.data) {
      console.error('Invalid response from Merriam-Webster API:', response.status);
      return null;
    }
    console.log('Raw response from Merriam-Webster:', JSON.stringify(response.data, null, 2));
    const transformedData = await transformMerriamWebsterResponse(response.data, word);
    console.log('Transformed dictionary data:', JSON.stringify(transformedData, null, 2));
    return transformedData;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching from Merriam-Webster API:', error.response?.status, error.response?.data);
    } else {
      console.error('An unexpected error occurred:', error);
    }
    return null;
  }
}

async function saveToDictionary(data: DictionaryEntry[]): Promise<void> {
    if (!data || data.length === 0) return;

    const entryToSave = data[0];
    const entries: { [key: string]: string[] } = {};
    entryToSave.meanings.forEach(meaning => {
        entries[meaning.partOfSpeech] = meaning.definitions.map(def => def.definition);
    });

    const filter = { word: entryToSave.word.toLowerCase() };
    const update = {
        $set: {
            entries,
            phonetics: entryToSave.phonetics,
            source: 'Merriam-Webster',
        }
    };
    const options = { upsert: true, new: true };

    try {
        await Dictionary.findOneAndUpdate(filter, update, options);
        console.log(`Successfully upserted "${entryToSave.word}" in the dictionary.`);
    } catch (error) {
        console.error(`Error upserting "${entryToSave.word}" in the dictionary:`, error);
    }
}

export async function getDictionaryDefinition(word: string): Promise<DictionaryEntry[] | null> {
  const lowercaseWord = word.toLowerCase();
  
  try {
    // 1. Check local DB for a cached Merriam-Webster entry
    const entry = await Dictionary.findOne({ word: lowercaseWord, source: 'Merriam-Webster' }).lean();
    if (entry) {
      console.log('Found cached Merriam-Webster entry in DB:', word);
      return transformMongoResponse(entry);
    }

    // 2. If not in cache, fetch from Merriam-Webster
    console.log('No cached M-W entry found. Fetching from API for:', word);
    const merriamWebsterData = await fetchFromMerriamWebster(word);

    if (merriamWebsterData) {
      // 3. Persist to local DB and return
      await saveToDictionary(merriamWebsterData);
      return merriamWebsterData;
    }

    return null;
  } catch (error) {
    console.error(`An error occurred in getDictionaryDefinition for "${word}":`, error);
    return null;
  }
}
