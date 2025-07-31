import { Router, Request, Response } from 'express';
import { validate } from 'echt';
import { openaiRateLimiter } from '../../middleware/rateLimiter';
import { WordList } from '../lists/model';
import { Word, IWord } from './model';
import { wordAgentService } from './agent-service';
import mongoose from 'mongoose';
import { getUserLanguages } from '../../utils/getUserLanguages';
import { 
  listIdSchema, 
  addWordSchema, 
  wordIdSchema, 
  wordContextSchema, 
  deleteWordSchema, 
  validateAnswerSchema 
} from './schemas';

const router = Router();

const transformWord = (word: IWord, listId: string) => {
  const context = word.ownedByLists.find(ctx => ctx.listId.toString() === listId);
  return {
    id: word._id.toString(),
    value: word.value,
    meaning: context?.meaning || '',
    learnedPoint: context?.learnedPoint || 0,
    definition: word.definition,
    phonetic: word.phonetic,
    dictionary: word.dictionary,
    created_at: word.created_at.toISOString(),
    updated_at: word.updated_at.toISOString()
  };
};

router.post('/:listId/words', validate(addWordSchema), async (req, res) => {
  try {
    const { listId } = req.params;
    const { word: value, meaning: providedMeaning } = req.body;

    const list = await WordList.findById(listId).lean();
    if (!list) return res.status(404).json({ message: 'List not found' });

    const definitionResult = await (async () => {
      const userId = req.headers['user-id'] as string;
      if (!userId) throw new Error('User ID is required');
      const { baseLanguage, targetLanguage } = await getUserLanguages(userId);
      return wordAgentService.generateDefinition(value, list.context || '', baseLanguage, targetLanguage);
    })();

    console.log('Definition result from agent:', JSON.stringify(definitionResult, null, 2));

    const normalizedValue = value.toLowerCase().trim();
    let word = await Word.findOne({ value: normalizedValue });
    
    if (word) {
      if (word.ownedByLists.some(ctx => ctx.listId.toString() === listId)) {
        return res.status(400).json({ message: 'Word already exists in this list' });
      }
      word.ownedByLists.push({ listId: new mongoose.Types.ObjectId(listId), meaning: definitionResult.definition, learnedPoint: 0 });
      await word.save();
    } else {
      const newWordData = {
        value: normalizedValue,
        ownedByLists: [{ listId: new mongoose.Types.ObjectId(listId), meaning: definitionResult.definition, learnedPoint: 0 }],
        definition: definitionResult.definition,
        phonetic: definitionResult.phonetic,
        dictionary: definitionResult.dictionary,
      };
      console.log('Creating new word with data:', JSON.stringify(newWordData, null, 2));
      word = await Word.create(newWordData);
    }

    await WordList.findByIdAndUpdate(listId, { updatedAt: new Date() });
    res.status(201).json({ ...transformWord(word, listId), _id: word._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:listId/words', validate(listIdSchema), async (req, res) => {
  try {
    const { listId } = req.params;
    const words = await Word.find({ 'ownedByLists.listId': listId }).lean();
    res.json(words.map(word => ({ ...transformWord(word as IWord, listId), _id: word._id })));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:listId/words/:wordId', validate(deleteWordSchema), async (req, res) => {
  try {
    const { listId, wordId } = req.params;

    const word = await Word.findById(wordId);
    if (!word) return res.status(404).json({ message: 'Word not found' });

    word.ownedByLists = word.ownedByLists.filter(ctx => ctx.listId.toString() !== listId);
    
    if (word.ownedByLists.length === 0) {
      await Word.findByIdAndDelete(wordId);
    } else {
      await word.save();
    }

    await WordList.findByIdAndUpdate(listId, { updatedAt: new Date() });
    res.json({ message: 'Word deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/validate-answer', validate(validateAnswerSchema), async (req: any, res) => {
  try {
    const { userAnswer, correctAnswer, context } = req.body;
    const userId = req.headers['user-id'] as string;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });
    const { baseLanguage, targetLanguage } = await getUserLanguages(userId);
    const result = await wordAgentService.validateAnswer(userAnswer, correctAnswer, context, baseLanguage, targetLanguage);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/word/:wordId', validate(wordIdSchema), async (req, res) => {
  try {
    const { wordId } = req.params;
    const word = await Word.findById(wordId).lean();
    if (!word) return res.status(404).json({ message: 'Word not found' });

    const contexts = await Promise.all(
      word.ownedByLists.map(async (context) => {
        const list = await WordList.findById(context.listId).lean();
        return {
          listId: context.listId.toString(),
          listName: list?.name || 'Unknown List',
          listContext: list?.context,
          meaning: context.meaning,
          learnedPoint: context.learnedPoint
        };
      })
    );

    res.json({
      id: word._id.toString(),
      value: word.value,
      contexts,
      definition: word.definition,
      phonetic: word.phonetic,
      dictionary: word.dictionary,
      examples: word.examples,
      created_at: word.created_at.toISOString(),
      updated_at: word.updated_at.toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/word/:wordId/generate-examples', validate(wordContextSchema), async (req, res) => {
  try {
    const { wordId } = req.params;
    const { contextIndex } = req.body;

    const word = await Word.findById(wordId);
    if (!word || !word.ownedByLists || contextIndex >= word.ownedByLists.length) {
      return res.status(404).json({ message: 'Word not found or invalid context' });
    }

    const wordContext = word.ownedByLists[contextIndex];
    const list = await WordList.findById(wordContext.listId).lean();
    const context = list?.context || 'General';

    const userId = req.headers['user-id'] as string;
    const { baseLanguage, targetLanguage } = await getUserLanguages(userId);
    const examples = await wordAgentService.generateExamples(word.value, wordContext.meaning, context, baseLanguage, targetLanguage);

    const newExamples = examples.map(ex => ({
      id: new mongoose.Types.ObjectId().toHexString(),
      sentence: ex.sentence,
      translation: ex.translation || '',
      context_and_usage: ex.context_note
    }));

    if (!word.examples) {
      word.examples = [];
    }
    word.examples.push(...newExamples);
    if (word.examples.length > 10) {
      word.examples = word.examples.slice(word.examples.length - 10);
    }

    await word.save();

    res.json({ examples: word.examples });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/word/:wordId/examples', async (req, res) => {
  try {
    const { wordId } = req.params;
    const { sentence } = req.body;

    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    if (word.examples && word.examples.length >= 10) {
      return res.status(400).json({ message: 'Maximum number of examples reached' });
    }

    const userId = req.headers['user-id'] as string;
    const { baseLanguage, targetLanguage } = await getUserLanguages(userId);
    const context = word.ownedByLists[0]?.meaning || 'General';
    const { translation, context_and_usage } = await wordAgentService.generateExampleDetails(sentence, baseLanguage, targetLanguage, context);

    const newExample = {
      id: new mongoose.Types.ObjectId().toHexString(),
      sentence,
      translation,
      context_and_usage
    };

    if (!word.examples) {
      word.examples = [];
    }

    word.examples.push(newExample);
    await word.save();

    res.status(201).json(newExample);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/word/:wordId/examples/:exampleId', async (req, res) => {
  try {
    const { wordId, exampleId } = req.params;

    const word = await Word.findById(wordId);
    if (!word || !word.examples) {
      return res.status(404).json({ message: 'Word or example not found' });
    }

    word.examples = word.examples.filter(ex => ex.id !== exampleId);
    await word.save();

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/word/:wordId/similar', openaiRateLimiter, validate(wordContextSchema), async (req, res) => {
  try {
    const { wordId } = req.params;
    const { contextIndex } = req.body;

    const word = await Word.findById(wordId).lean();
    if (!word || contextIndex >= word.ownedByLists.length) {
      return res.status(404).json({ message: 'Word not found or invalid context' });
    }

    const wordContext = word.ownedByLists[contextIndex];
    const list = await WordList.findById(wordContext.listId).lean();
    const context = list?.context || 'General';

    const userId = req.headers['user-id'] as string;
    const { baseLanguage, targetLanguage } = await getUserLanguages(userId);
    const similarWords = await wordAgentService.generateSimilarWords(word.value, wordContext.meaning, context, baseLanguage, targetLanguage);

    res.json({
      word: word.value,
      meaning: wordContext.meaning,
      context,
      similar_words: similarWords
    });
  } catch (error) {
    console.error(error); 
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:listId/light-reading', openaiRateLimiter, validate(listIdSchema), async (req, res) => {
  try {
    const { listId } = req.params;

    const [words, list] = await Promise.all([
      Word.find({ 'ownedByLists.listId': listId }).lean(),
      WordList.findById(listId).lean()
    ]);

    if (words.length === 0) {
      return res.status(400).json({ message: 'No words found in this list' });
    }

    const userId = req.headers['user-id'] as string;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });
    const { baseLanguage, targetLanguage } = await getUserLanguages(userId);

    const wordsForReading = words.map(word => {
      const wordContext = word.ownedByLists.find(ctx => ctx.listId.toString() === listId);
      return { value: word.value, meaning: wordContext?.meaning || '' };
    });

    const reading = await wordAgentService.generateLightReading(wordsForReading, list?.context || 'General', baseLanguage, targetLanguage);
    res.json(reading);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;