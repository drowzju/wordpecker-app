import { WordList } from '../api/lists/model';
import { Word, IWord } from '../api/words/model';
import { wordAgentService } from '../api/words/agent-service';
import mongoose from 'mongoose';
import { getUserLanguages } from '../utils/getUserLanguages';
import { getDictionaryDefinition } from './dictionaryService';

class WordService {
  async addWordToList(listId: string, wordValue: string, userId: string, predefinedData?: { definition: string, phonetic?: string, partOfSpeech?: string, examples?: any[] }) {
    const list = await WordList.findById(listId).lean();
    if (!list) {
      throw new Error('List not found');
    }

    const normalizedValue = wordValue.toLowerCase().trim();
    let word = await Word.findOne({ value: normalizedValue });

    let definitionResult;
    let dictionaryData;

    // If the word already exists, we might not need to fetch definitions again
    if (word && word.ownedByLists.some(ctx => ctx.listId.toString() === listId)) {
      return word; // Word already exists in the list, do nothing
    }

    if (predefinedData?.definition) {
      // Use predefined definition and supplement with dictionary data
      definitionResult = { 
        definition: predefinedData.definition,
        phonetic: predefinedData.phonetic,
        partOfSpeech: predefinedData.partOfSpeech,
      };
      dictionaryData = await getDictionaryDefinition(wordValue);
    } else {
      // Generate new definition using AI and supplement with dictionary data
      const { baseLanguage, targetLanguage } = await getUserLanguages(userId);
      definitionResult = await wordAgentService.generateDefinition(wordValue, list.context || '', baseLanguage, targetLanguage);
      dictionaryData = await getDictionaryDefinition(wordValue);
    }

    // Combine results for storage
    let finalDictionary: any[] = (dictionaryData && Array.isArray(dictionaryData.dictionary)) ? dictionaryData.dictionary : [];

    if (predefinedData?.phonetic) {
      if (finalDictionary.length > 0 && finalDictionary[0]) {
        // If dictionary entries exist, add phonetic to the first one if it's missing
        if (!finalDictionary[0].phonetics || !Array.isArray(finalDictionary[0].phonetics) || finalDictionary[0].phonetics.length === 0) {
          finalDictionary[0].phonetics = [{ text: predefinedData.phonetic, audio: '' }];
        }
      } else {
        // If no dictionary entries exist, create a basic one with the phonetic info
        finalDictionary.push({
          partOfSpeech: predefinedData.partOfSpeech || 'unknown',
          entryNumber: 1,
          phonetics: [{ text: predefinedData.phonetic, audio: '' }],
          definitions: [{ definition: predefinedData.definition, number: '1' }],
        });
      }
    }

    if (word) {
      // Word exists, but not in this list. Add it to the list.
      word.ownedByLists.push({ 
        listId: new mongoose.Types.ObjectId(listId), 
        meaning: definitionResult.definition, 
        learnedPoint: 0 
      });
      // Update dictionary info if it's new
      if (!word.dictionary || word.dictionary.length === 0) {
        word.dictionary = finalDictionary;
      }
      await word.save();
    } else {
      // Word does not exist, create a new one
      const newWordData: Partial<IWord> = {
        value: normalizedValue,
        ownedByLists: [{
           listId: new mongoose.Types.ObjectId(listId), 
           meaning: definitionResult.definition, 
           learnedPoint: 0 
        }],
        definition: definitionResult.definition,
        dictionary: finalDictionary,
        examples: predefinedData?.examples?.map(ex => ({ 
          id: new mongoose.Types.ObjectId().toHexString(), 
          sentence: ex.sentence, 
          translation: ex.translation,
          context_and_usage: ex.context_note 
        })) || []
      };
      word = await Word.create(newWordData);
    }

    await WordList.findByIdAndUpdate(listId, { $inc: { wordCount: 1 }, updatedAt: new Date() });

    return word;
  }

  async batchUpdatePoints(listId: string, updates: { wordId: string; change: number }[]) {
    if (!updates || updates.length === 0) {
      return { message: 'No updates provided.' };
    }

    const wordIds = updates.map(u => new mongoose.Types.ObjectId(u.wordId));
    const words = await Word.find({ _id: { $in: wordIds } });

    const bulkOps = [];

    for (const word of words) {
      const updateInfo = updates.find(u => u.wordId === word._id.toString());
      if (!updateInfo) continue;

      const listInfo = word.ownedByLists.find(l => l.listId.toString() === listId);
      if (!listInfo) continue;

      const currentPoints = listInfo.learnedPoint || 0;
      let newPoints = currentPoints + updateInfo.change;
      
      // Clamping logic
      if (newPoints > 100) newPoints = 100;
      if (newPoints < 0) newPoints = 0;

      bulkOps.push({
        updateOne: {
          filter: { _id: word._id, 'ownedByLists.listId': new mongoose.Types.ObjectId(listId) },
          update: {
            $set: { 'ownedByLists.$.learnedPoint': newPoints }
          }
        }
      });
    }

    if (bulkOps.length === 0) {
      return { message: 'No valid updates to perform.' };
    }

    const result = await Word.bulkWrite(bulkOps);
    return result;
  }
}

export const wordService = new WordService();
