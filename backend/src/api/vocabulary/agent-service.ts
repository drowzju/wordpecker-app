import { getVocabulary } from '../../agents';
import { VocabularyResultType, VocabularyWordType } from '../../agents/vocabulary-agent/schemas';
import { generativeAIService } from '../../services/ai';
import * as fs from 'fs';
import * as path from 'path';

const vocabularyPromptPath = path.join(__dirname, '..', '..', 'agents', 'vocabulary-agent', 'prompt.md');
const vocabularySystemPrompt = fs.readFileSync(vocabularyPromptPath, 'utf-8');

export class VocabularyAgentService {
  async generateWords(count: number, difficulty: string, context: string, baseLanguage: string, targetLanguage: string, excludeWords: string[]): Promise<VocabularyWordType[]> {
    const prompt = `Generate ${count} ${difficulty}-level vocabulary words for the context "${context}". Generate words in ${targetLanguage} with definitions in ${baseLanguage}. Exclude these words: ${excludeWords.join(', ')}.`;
    const resultText = await generativeAIService.generateText({ prompt, systemPrompt: vocabularySystemPrompt });
    console.log('VocabularyAgentService: Raw resultText from AI:', resultText);
    // Extract JSON from markdown code block if present
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    console.log('VocabularyAgentService: jsonMatch:', jsonMatch);
    let jsonString = resultText;
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }
    console.log('VocabularyAgentService: jsonString after extraction:', jsonString);
    const result = JSON.parse(jsonString) as VocabularyResultType;
    return result.words;
  }

  async getWordDetails(word: string, context: string, baseLanguage: string, targetLanguage: string): Promise<VocabularyWordType> {
    const prompt = `Provide detailed information about the word "${word}" in the context of "${context}". The word is in ${targetLanguage} and the definition should be in ${baseLanguage}. The example sentence must be in ${targetLanguage}.`;
    const resultText = await generativeAIService.generateText({ prompt, systemPrompt: vocabularySystemPrompt });
    // Extract JSON from markdown code block if present
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = resultText;
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }
    const result = JSON.parse(jsonString) as VocabularyResultType;
    return result.words[0]; // Get first word from response
  }
}

export const vocabularyAgentService = new VocabularyAgentService();