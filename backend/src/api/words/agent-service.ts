import {
  getValidation,
  getSimilarWords,
  getReading,
  getExamples
} from '../../agents';
import { DefinitionResultType } from '../../agents/definition-agent/schemas';
import { ValidationResultType } from '../../agents/validation-agent/schemas';
import { ExamplesResultType, SentenceExampleType } from '../../agents/examples-agent/schemas';
import { SimilarWordsResultType } from '../../agents/similar-words-agent/schemas';
import { ReadingResultType } from '../../agents/reading-agent/schemas';
import { generativeAIService } from '../../services/ai';
import { getDictionaryDefinition } from '../../services/dictionaryService';
import * as fs from 'fs';
import * as path from 'path';

const examplesPromptPath = path.join(__dirname, '..', '..', 'agents', 'examples-agent', 'prompt.md');
const examplesSystemPrompt = fs.readFileSync(examplesPromptPath, 'utf-8');

const definitionPromptPath = path.join(__dirname, '..', '..', 'agents', 'definition-agent', 'prompt.md');
const definitionSystemPrompt = fs.readFileSync(definitionPromptPath, 'utf-8');

const validationPromptPath = path.join(__dirname, '..', '..', 'agents', 'validation-agent', 'prompt.md');
const validationSystemPrompt = fs.readFileSync(validationPromptPath, 'utf-8');

const readingPromptPath = path.join(__dirname, '..', '..', 'agents', 'reading-agent', 'prompt.md');
const readingSystemPrompt = fs.readFileSync(readingPromptPath, 'utf-8');

const similarWordsPromptPath = path.join(__dirname, '..', '..', 'agents', 'similar-words-agent', 'prompt.md');
const similarWordsSystemPrompt = fs.readFileSync(similarWordsPromptPath, 'utf-8');

export class WordAgentService {
  async generateDefinition(word: string, context: string, baseLanguage: string, targetLanguage: string): Promise<DefinitionResultType> {
    const prompt = `Generate a clear definition for the word "${word}" in the context of "${context}". The word is in ${targetLanguage} and the definition should be in ${baseLanguage}.`;
    const resultText = await generativeAIService.generateText({ prompt, systemPrompt: definitionSystemPrompt });
  
    let definitionResult: DefinitionResultType;
  
    try {
      const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
      let jsonString = resultText;
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
      }
      definitionResult = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse definition result from AI service.', e);
      definitionResult = { definition: '' };
    }
  
    const dictionaryData = await getDictionaryDefinition(word);
    if (dictionaryData) {
      definitionResult.dictionary = [dictionaryData];
    }
  
    return definitionResult;
  }

  async validateAnswer(userAnswer: string, correctAnswer: string, context: string, baseLanguage: string, targetLanguage: string): Promise<ValidationResultType> {
    const prompt = `Validate if the user's answer "${userAnswer}" is correct for the expected answer "${correctAnswer}". Context: ${context || 'General language exercise'}. User speaks ${baseLanguage} and is learning ${targetLanguage}.`;
    const resultText = await generativeAIService.generateText({ prompt, systemPrompt: validationSystemPrompt });
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = resultText;
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }
    const result = JSON.parse(jsonString) as ValidationResultType;
    return result;
  }

  async generateExamples(word: string, meaning: string, context: string, baseLanguage: string, targetLanguage: string): Promise<SentenceExampleType[]> {
    const prompt = `Generate 3-5 sentence examples for the word "${word}" with meaning "${meaning}" in the context of "${context}". Examples should be in ${targetLanguage} with explanations in ${baseLanguage}.`;
    try {
      const resultText = await generativeAIService.generateText({ prompt, systemPrompt: examplesSystemPrompt });
      const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
      let jsonString = resultText;
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
      }
      const result = JSON.parse(jsonString) as ExamplesResultType;
      return result.examples;
    } catch (e) {
      console.error('Failed to generate or parse examples from AI service.', e);
      throw new Error('Failed to generate examples.');
    }
  }

  async generateExampleDetails(sentence: string, baseLanguage: string, targetLanguage: string, context: string): Promise<{ translation: string, context_and_usage: string }> {
    const prompt = `For the sentence "${sentence}" in ${targetLanguage}, provide a translation in ${baseLanguage} and explain the context and usage. The context is ${context}. Please conform to the 'For Generating Details for a Single Sentence' schema.`;
    const resultText = await generativeAIService.generateText({ prompt, systemPrompt: examplesSystemPrompt });
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = resultText;
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }
    try {
      const result = JSON.parse(jsonString);
      return result;
    } catch (e) {
      console.error('Failed to parse example details from AI service.', e);
      throw new Error('Failed to generate example details.');
    }
  }

  async generateSimilarWords(word: string, meaning: string, context: string, baseLanguage: string, targetLanguage: string): Promise<SimilarWordsResultType> {
    const prompt = `Find similar words and synonyms for the word "${word}" with meaning "${meaning}" in the context of "${context}". Find words in ${targetLanguage} with definitions in ${baseLanguage}.`;
    const resultText = await generativeAIService.generateText({ prompt, systemPrompt: similarWordsSystemPrompt });
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = resultText;
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }
    const similarWords = JSON.parse(jsonString) as SimilarWordsResultType;
    return similarWords;
  }

  async generateLightReading(words: Array<{value: string, meaning: string}>, context: string, baseLanguage: string, targetLanguage: string): Promise<ReadingResultType> {
    const prompt = `Create an intermediate-level reading passage in ${targetLanguage} that incorporates these vocabulary words: ${words.map(w => `${w.value} (${w.meaning})`).join(', ')}. Context: "${context}". The passage should be suitable for ${baseLanguage} speakers learning ${targetLanguage}.`;
    const resultText = await generativeAIService.generateText({ prompt, systemPrompt: readingSystemPrompt });
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = resultText;
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }
    const reading = JSON.parse(jsonString) as ReadingResultType;
    return reading;
  }
}

export const wordAgentService = new WordAgentService();