import { Dictionary } from '../api/dictionary/model';

// Interfaces for our internal data structure (remains the same)
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

// Adapter to transform the MongoDB document to our internal format
const transformMongoResponse = (doc: any): DictionaryEntry[] => {
  const meanings: Meaning[] = [];
  
  // Check if entries is an object (the common case)
  if (typeof doc.entries === 'object' && doc.entries !== null && !Array.isArray(doc.entries)) {
    for (const partOfSpeech in doc.entries) {
      if (Object.prototype.hasOwnProperty.call(doc.entries, partOfSpeech)) {
        const definitionsSource = doc.entries[partOfSpeech];
        let definitions: Definition[] = [];

        if (Array.isArray(definitionsSource)) {
          definitions = definitionsSource.map((def: string) => ({ definition: def }));
        } else if (typeof definitionsSource === 'string') {
          definitions = [{ definition: definitionsSource }];
        }

        if (definitions.length > 0) {
          meanings.push({ partOfSpeech, definitions });
        }
      }
    }
  } else if (typeof doc.entries === 'string') {
    // Handle the case where the entire entry is a single string (e.g., "See HELLO.")
    meanings.push({
      partOfSpeech: 'Note',
      definitions: [{ definition: doc.entries }]
    });
  }

  return [{
    word: doc.word,
    phonetics: [], // The local dictionary doesn't have phonetic data
    meanings,
  }];
};

export async function getDictionaryDefinition(word: string): Promise<DictionaryEntry[] | null> {
  console.log('Fetching dictionary definition from local MongoDB for:', word);

  try {
    const entry = await Dictionary.findOne({ word: word.toLowerCase() }).lean();

    if (entry) {
      return transformMongoResponse(entry);
    }
    
    console.log('No local dictionary entry found for the word.');
    return null;
  } catch (error) {
    console.error('Error fetching from local dictionary:', error);
    return null;
  }
}