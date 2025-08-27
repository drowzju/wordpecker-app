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
}

export interface Derivative {
  word: string;
  partOfSpeech: string;
}

export interface StructuredEntry {
  partOfSpeech: string;
  entryNumber: number;
  phonetics: Phonetic[];
  definitions: Definition[];
  derivatives?: Derivative[];
}

export interface DictionaryDocument {
  word: string;
  dictionary: StructuredEntry[];
  stems?: string[];
}

// --- Merriam-Webster Specific Interfaces ---

interface MerriamWebsterPronunciation {
  mw: string;
  sound?: { audio: string; };
}

interface MerriamWebsterUro {
  ure: string;
  fl: string;
  prs?: MerriamWebsterPronunciation[];
}

export interface MerriamWebsterEntry {
  meta: { id: string; stems?: string[]; };
  hom?: number;
  hwi: { hw: string; prs?: MerriamWebsterPronunciation[]; };
  fl: string; // part of speech
  def?: { sseq: any[]; }[];
  uros?: MerriamWebsterUro[];
  shortdef: string[];
}

// --- Utility Functions ---

function buildAudioUrl(audioFile: string): string {
  if (!audioFile) return '';
  const subdirectory = audioFile.match(/^(bix|gg|_|[.,;!?]|\d)/)?.[0] || audioFile.charAt(0).toLowerCase();
  const directoryMap: { [key: string]: string } = {
    'bix': 'bix', 'gg': 'gg', '_': 'punct', '.': 'punct', ',': 'punct', ';': 'punct', '!': 'punct', '?': 'punct',
  };
  const finalSubdirectory = directoryMap[subdirectory] || (/\d/.test(subdirectory) ? 'number' : subdirectory);
  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${finalSubdirectory}/${audioFile}.mp3`;
}

function processPhonetics(prs: MerriamWebsterPronunciation[] | undefined): Phonetic[] {
  if (!prs) return [];
  return prs.map(p => ({
    text: p.mw,
    audio: p.sound?.audio ? buildAudioUrl(p.sound.audio) : undefined,
  }));
}

function cleanDefinitionText(text: string): string {
  if (!text) return '';
  return text
    .replace(/{bc}/g, '')
    .replace(/{\/?it}/g, '')
    .replace(/{\/?wi}/g, '')
    .replace(/{a_link\|([^|}]+)}/g, '$1')
    .replace(/{d_link\|([^|]+)\|[^}]*}/g, '$1')
    .replace(/{sx\|([^|]+)\|\|[^}]*}/g, '($1)')
    .trim();
}

function extractSenses(data: any, definitions: Definition[] = []): Definition[] {
    if (Array.isArray(data)) {
        if (data[0] === 'sense') {
            const sense = data[1];
            let definitionText = '';
            const examples: string[] = [];

            const processDt = (dt: any[]) => {
                dt.forEach((item: any[]) => {
                    if (item[0] === 'text') {
                        definitionText += ' ' + cleanDefinitionText(item[1]);
                    } else if (item[0] === 'vis') {
                        item[1].forEach((v: any) => {
                            examples.push(cleanDefinitionText(v.t));
                        });
                    }
                });
            };

            if (sense.dt) {
                processDt(sense.dt);
            }

            if (sense.sdsense) {
                definitionText += ` especially : ${cleanDefinitionText(sense.sdsense.sd || '')}`;
                if (sense.sdsense.dt) {
                    processDt(sense.sdsense.dt);
                }
            }

            let fullDefinition = definitionText.trim();
            if (examples.length > 0) {
                fullDefinition += ` e.g., ${examples.join(', ')}`;
            }

            if (fullDefinition) {
                definitions.push({
                    number: sense.sn,
                    definition: fullDefinition,
                });
            }
        } else {
            for (const item of data) {
                extractSenses(item, definitions);
            }
        }
    }
    return definitions;
}

// --- Core Transformation Logic ---

export const transformMerriamWebsterResponse = async (apiResponse: MerriamWebsterEntry[], query: string): Promise<DictionaryDocument | null> => {
  if (!apiResponse || apiResponse.length === 0 || typeof apiResponse[0] !== 'object') {
    return null;
  }

  const coreEntries = apiResponse.filter(entry => {
    if (!entry.meta?.id) return false;
    const id = entry.meta.id.toLowerCase();
    const queryWord = query.toLowerCase();
    if (id === queryWord) return true;
    if (id.startsWith(queryWord + ':') && !isNaN(parseInt(id.split(':')[1]))) {
      return true;
    }
    return false;
  });

  if (coreEntries.length === 0) {
    console.error("Filtering resulted in zero core entries. Check filter logic against raw API response.");
    return null;
  }

  const groupedByHomograph = coreEntries.reduce((acc, entry) => {
    const homographNumber = entry.hom || 0;
    if (!acc[homographNumber]) acc[homographNumber] = [];
    acc[homographNumber].push(entry);
    return acc;
  }, {} as Record<number, MerriamWebsterEntry[]>);

  const dictionaryEntries: StructuredEntry[] = Object.values(groupedByHomograph).map((homographGroup, index) => {
    const mainEntry = homographGroup[0];
    return {
      partOfSpeech: mainEntry.fl,
      entryNumber: index + 1,
      phonetics: processPhonetics(mainEntry.hwi?.prs),
      definitions: mainEntry.def?.[0]?.sseq ? extractSenses(mainEntry.def[0].sseq) : [],
      derivatives: mainEntry.uros?.map(uro => ({ word: uro.ure.replace(/\*/g, ''), partOfSpeech: uro.fl })) || [],
    };
  });

  const stems = Array.from(new Set(apiResponse.flatMap(e => e.meta?.stems || [])));

  return {
    word: query,
    dictionary: dictionaryEntries,
    stems,
  };
};

// --- Database and Exported Functions ---

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
    console.error(`An error occurred while fetching from Merriam-Webster for "${word}".`);
    if (axios.isAxiosError(error)) {
      // Log detailed axios error information
      console.error('Axios error details:', JSON.stringify({
        message: error.message,
        code: error.code,
        status: error.response?.status,
        headers: error.response?.headers,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
        }
      }, null, 2));
    } else {
      // Log the whole unexpected error object
      console.error('Unexpected error:', error);
    }
    return null;
  }
}