import axios from 'axios';
import { Dictionary } from '../api/dictionary/model';
import { environment } from '../config/environment';

// --- Main Data Structures ---

export interface Phonetic {
  text?: string;
  audio?: string;
}

export interface Definition {
  number?: string; // e.g., "1", "2a", "b(1)"
  definition: string;
  example?: string;
}

export interface Derivative {
  word: string;
  partOfSpeech: string;
}

// A structured entry, like "present (noun, 1 of 4)"
export interface StructuredEntry {
  partOfSpeech: string;
  entryNumber: number;
  phonetics: Phonetic[];
  definitions: Definition[];
  derivatives?: Derivative[];
}

// The canonical document stored in MongoDB
export interface DictionaryDocument {
  word: string;
  dictionary: StructuredEntry[];
  stems?: string[];
}

// --- Merriam-Webster Specific Interfaces ---

interface MerriamWebsterPronunciation {
  mw: string;
  sound?: {
    audio: string;
  };
}

interface MerriamWebsterUro {
  ure: string;
  fl: string;
  prs?: MerriamWebsterPronunciation[];
}

// A simplified interface focusing on the parts we parse.
interface MerriamWebsterEntry {
  meta: {
    id: string;
    stems?: string[];
  };
  hom?: number;
  hwi: {
    hw: string;
    prs?: MerriamWebsterPronunciation[];
  };
  fl: string; // part of speech
  def?: {
    sseq: any[];
  }[];
  uros?: MerriamWebsterUro[];
  shortdef: string[];
}

// --- Utility Functions ---

/**
 * Builds the full audio URL for a Merriam-Webster audio file.
 */
function buildAudioUrl(audioFile: string): string {
  if (!audioFile) return '';
  const subdirectory = audioFile.match(/^(bix|gg|_|[.,;!?]|\d)/)?.[0] || audioFile.charAt(0).toLowerCase();
  const directoryMap: { [key: string]: string } = {
    'bix': 'bix',
    'gg': 'gg',
    '_': 'punct',
    '.': 'punct',
    ',': 'punct',
    ';': 'punct',
    '!': 'punct',
    '?': 'punct',
  };
  const finalSubdirectory = directoryMap[subdirectory] || (/\d/.test(subdirectory) ? 'number' : subdirectory);
  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${finalSubdirectory}/${audioFile}.mp3`;
}

/**
 * Processes a list of pronunciations from the API into our Phonetic format.
 */
function processPhonetics(prs: MerriamWebsterPronunciation[] | undefined): Phonetic[] {
  if (!prs) return [];
  return prs.map(p => ({
    text: p.mw,
    audio: p.sound?.audio ? buildAudioUrl(p.sound.audio) : undefined,
  }));
}

/**
 * Cleans definition text by removing or replacing Merriam-Webster's formatting tags.
 * @param text The raw text from the API.
 * @returns A clean, readable string.
 */
function cleanDefinitionText(text: string): string {
  if (!text) return '';
  return text
    .replace(/{bc}/g, '') // Remove bold colon
    .replace(/{\/it}/g, '') // Remove italic tags
    .replace(/{it}/g, '')
    .replace(/{a_link|([^|}]+)|[^}]*}/g, '$1') // Extract text from links
    .replace(/{sx|([^|}]+)|[^}]*}/g, '($1)') // Extract text from synonym links
    .trim();
}

/**
 * Recursively parses the 'sseq' (sense sequence) to extract structured definitions.
 * @param senseSequence The sseq array from the API.
 * @returns An array of structured Definition objects.
 */
function parseSenses(senseSequence: any[]): Definition[] {
  let definitions: Definition[] = [];

  senseSequence.forEach(item => {
    // It's a sense block
    if (Array.isArray(item) && item[0] === 'sense') {
      const sense = item[1];
      const definitionParts: string[] = [];
      
      sense.dt?.forEach((dt: any[]) => {
        if (dt[0] === 'text') {
          definitionParts.push(cleanDefinitionText(dt[1]));
        } else if (dt[0] === 'vis') {
          const examples = dt[1].map((v: any) => cleanDefinitionText(v.t)).join(', ');
          definitionParts.push(`e.g., ${examples}`);
        }
      });

      const fullDefinition = definitionParts.join(' ').trim();
      if (fullDefinition) {
        definitions.push({
          number: sense.sn,
          definition: fullDefinition,
        });
      }
    }
    // It's a paragraph sequence, recurse into it
    else if (Array.isArray(item) && item[0] === 'pseq') {
      definitions = definitions.concat(parseSenses(item[1]));
    }
  });

  return definitions;
}


/**
 * Transforms the raw Merriam-Webster API response into a structured DictionaryDocument.
 * This new version accurately groups entries by homograph, parses detailed definitions,
 * and correctly associates phonetics and derivatives.
 *
 * @param apiResponse The raw data array from the Merriam-Webster API.
 * @param query The original word that was searched for.
 * @returns A promise that resolves to a structured DictionaryDocument, or null.
 */
const transformMerriamWebsterResponse = async (apiResponse: MerriamWebsterEntry[], query: string): Promise<DictionaryDocument | null> => {
  if (!apiResponse || apiResponse.length === 0 || typeof apiResponse[0] !== 'object') {
    return null;
  }

  // 1. Filter for core entries related to the query word.
  const coreEntries = apiResponse.filter(entry =>
    entry.meta?.id &&
    (entry.meta.id.toLowerCase() === query.toLowerCase() || new RegExp(`^${query.toLowerCase()}:\\d+$`).test(entry.meta.id.toLowerCase()))
  );

  if (coreEntries.length === 0) return null;

  // 2. Group core entries by homograph number.
  const groupedByHomograph = coreEntries.reduce((acc, entry) => {
    const homographNumber = entry.hom || 0;
    if (!acc[homographNumber]) {
      acc[homographNumber] = [];
    }
    acc[homographNumber].push(entry);
    return acc;
  }, {} as Record<number, MerriamWebsterEntry[]>);

  // 3. Process each homograph group into a StructuredEntry.
  const dictionaryEntries: StructuredEntry[] = Object.values(groupedByHomograph).map((homographGroup, index) => {
    const mainEntry = homographGroup[0];
    const partOfSpeech = mainEntry.fl;

    const phonetics = processPhonetics(mainEntry.hwi?.prs);
    
    const definitions = mainEntry.def?.[0]?.sseq ? parseSenses(mainEntry.def[0].sseq) : [];

    const derivatives = mainEntry.uros?.map((uro: any) => ({
      word: uro.ure.replace(/\*/g, ''),
      partOfSpeech: uro.fl,
    })) || [];

    return {
      partOfSpeech,
      entryNumber: index + 1,
      phonetics,
      definitions,
      derivatives,
    };
  });

  // 4. Consolidate all unique stems from the entire API response.
  const stems = Array.from(new Set(apiResponse.flatMap(e => e.meta?.stems || [])));

  return {
    word: query,
    dictionary: dictionaryEntries,
    stems,
  };
};

/**
 * Saves a single, canonical dictionary entry to the database.
 * @param data The DictionaryDocument object to save.
 */
async function saveToDictionary(data: DictionaryDocument): Promise<void> {
  if (!data) return;

  const filter = { word: data.word.toLowerCase() };
  const update = { $set: data };
  const options = { upsert: true };

  try {
    await Dictionary.findOneAndUpdate(filter, update, options);
    console.log(`Successfully upserted canonical entry for "${data.word}" in the dictionary.`);
  } catch (error) {
    console.error(`Error upserting "${data.word}" in the dictionary:`, error);
  }
}

/**
 * Fetches a word's definition, starting with a cache check and falling back to the API.
 * It handles root words and derivatives, always aiming to return a single canonical entry.
 *
 * @param word The word to look up (can be a root or a derivative).
 * @returns A promise that resolves to a single DictionaryDocument or null.
 */
export async function getDictionaryDefinition(word: string): Promise<DictionaryDocument | null> {
  const lowercaseWord = word.toLowerCase();

  try {
    const cachedEntry = await Dictionary.findOne({ stems: lowercaseWord }).lean();
    if (cachedEntry) {
      console.log(`Found cached entry for "${word}" via its root "${cachedEntry.word}".`);
      return cachedEntry as unknown as DictionaryDocument;
    }

    console.log('No cached entry found. Fetching from API for:', word);
    const apiKey = environment.merriamWebsterApiKey;
    if (!apiKey) {
      console.log('Merriam-Webster API key not configured.');
      return null;
    }
    const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${lowercaseWord}?key=${apiKey}`;
    
    const response = await axios.get<MerriamWebsterEntry[]>(url, { proxy: false });

    console.log('Raw response from Merriam-Webster:', JSON.stringify(response.data, null, 2));

    if (response.status !== 200 || !response.data) {
      console.error('Invalid response from Merriam-Webster API:', response.status);
      return null;
    }
    
    const transformedData = await transformMerriamWebsterResponse(response.data, lowercaseWord);
    console.log('Transformed to canonical entry:', JSON.stringify(transformedData, null, 2));

    if (transformedData) {
      await saveToDictionary(transformedData);
      return transformedData;
    }

    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Error fetching from Merriam-Webster for "${word}":`, error.response?.status, error.response?.data);
    } else {
      console.error(`An unexpected error occurred in getDictionaryDefinition for "${word}":`, error);
    }
    return null;
  }
}