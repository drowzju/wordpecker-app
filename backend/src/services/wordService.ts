import { WordList } from '../api/lists/model';
import { Word } from '../api/words/model';
import { wordAgentService } from '../api/words/agent-service';
import mongoose from 'mongoose';
import { getUserLanguages } from '../utils/getUserLanguages';
import { getDictionaryDefinition } from './dictionaryService';

class WordService {
  async addWordToList(listId: string, wordValue: string, userId: string, predefinedDefinition?: { definition: string, phonetic?: string, partOfSpeech?: string }) {
    const list = await WordList.findById(listId).lean();
    if (!list) {
      throw new Error('List not found');
    }

    let definitionResult;
    if (predefinedDefinition) {
      definitionResult = { 
        definition: predefinedDefinition.definition,
        phonetic: predefinedDefinition.phonetic,
        partOfSpeech: predefinedDefinition.partOfSpeech,
        dictionary: []
      };
    } else {
      const { baseLanguage, targetLanguage } = await getUserLanguages(userId);
      definitionResult = await wordAgentService.generateDefinition(wordValue, list.context || '', baseLanguage, targetLanguage);
    }

    const dictionaryData = await getDictionaryDefinition(wordValue);
    if (dictionaryData) {
        definitionResult.dictionary = [dictionaryData];
    }

    const normalizedValue = wordValue.toLowerCase().trim();
    let word = await Word.findOne({ value: normalizedValue });

    if (word) {
      if (word.ownedByLists.some(ctx => ctx.listId.toString() === listId)) {
        return word; // Word already exists in the list, do nothing
      }
      word.ownedByLists.push({ listId: new mongoose.Types.ObjectId(listId), meaning: definitionResult.definition, learnedPoint: 0 });
      word.dictionary = definitionResult.dictionary;
      await word.save();
    } else {
      const newWordData = {
        value: normalizedValue,
        ownedByLists: [{ listId: new mongoose.Types.ObjectId(listId), meaning: definitionResult.definition, learnedPoint: 0 }],
        definition: definitionResult.definition,
        dictionary: definitionResult.dictionary,
      };
      word = await Word.create(newWordData);
    }

    await WordList.findByIdAndUpdate(listId, { updatedAt: new Date() });

    return word;
  }
}

export const wordService = new WordService();