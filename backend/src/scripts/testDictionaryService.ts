
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import axios from 'axios';
import * as fs from 'fs';
import { transformMerriamWebsterResponse } from '../services/dictionaryService';
import { environment } from '../config/environment';
import { MerriamWebsterEntry, DictionaryDocument } from '../services/dictionaryService';

const dictExampleDir = path.join(__dirname, '../../dict_example');

if (!fs.existsSync(dictExampleDir)) {
    fs.mkdirSync(dictExampleDir, { recursive: true });
}

async function testDictionaryService(word: string): Promise<void> {
    const lowercaseWord = word.toLowerCase();
    const apiKey = environment.merriamWebsterApiKey;

    if (!apiKey) {
        console.error('Merriam-Webster API key not configured.');
        return;
    }

    const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${lowercaseWord}?key=${apiKey}`;

    try {
        // 1. Fetch raw data from Merriam-Webster
        const response = await axios.get<MerriamWebsterEntry[]>(url, { proxy: false });
        const rawData = response.data;

        if (response.status !== 200 || !rawData) {
            console.error('Invalid response from Merriam-Webster API:', response.status);
            return;
        }

        const rawFilePath = path.join(dictExampleDir, `${word}_raw.txt`);
        fs.writeFileSync(rawFilePath, JSON.stringify(rawData, null, 2));
        console.log(`Raw data for "${word}" saved to ${rawFilePath}`);

        // 2. Transform the data
        const transformedData = await transformMerriamWebsterResponse(rawData, lowercaseWord);

        if (transformedData) {
            const transformedFilePath = path.join(dictExampleDir, `${word}_trans.txt`);
            fs.writeFileSync(transformedFilePath, JSON.stringify(transformedData, null, 2));
            console.log(`Transformed data for "${word}" saved to ${transformedFilePath}`);
        } else {
            console.log(`Transformation for "${word}" resulted in null.`);
        }

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`Error fetching from Merriam-Webster for "${word}":`, error.response?.status, error.response?.data);
        } else {
            console.error(`An unexpected error occurred for "${word}":`, error);
        }
    }
}

// Example usage:
// You can run this script from your terminal, e.g., by using ts-node
// ts-node backend/src/scripts/testDictionaryService.ts your_word_here
const word = process.argv[2];

if (!word) {
    console.log("Please provide a word as a command-line argument.");
    process.exit(1);
}

testDictionaryService(word);
