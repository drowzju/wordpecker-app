import fetch from 'node-fetch';

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

export async function getDictionaryDefinition(word: string, language: string = 'en'): Promise<DictionaryEntry[] | null> {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/${language}/${word}`;
  console.log('Fetching dictionary definition from:', url);

  try {
    const response = await fetch(url, { timeout: 5000 }); // 5-second timeout
    if (!response.ok) {
      console.error(`Dictionary API request failed with status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return data as DictionaryEntry[];
    }
    return null;
  } catch (error) {
    console.error('Error fetching from dictionary API:', error);
    return null;
  }
}
