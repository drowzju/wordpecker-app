import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { validate } from 'echt';
import { wordService } from '../../services/wordService';
import { WordList, IWordList } from './model';
import { Word } from '../words/model';
import { Exercise } from '../learn/exerciseModel';
import { Quiz } from '../quiz/quizModel';
import { createListSchema, listParamsSchema, updateListSchema } from './schemas';
import { generatePronunciationAudio } from './controller';

const router = Router();

const transform = (list: IWordList) => ({
  id: list._id.toString(),
  name: list.name,
  description: list.description,
  context: list.context,
  created_at: list.created_at.toISOString(),
  updated_at: list.updated_at.toISOString()
});

router.post('/', validate(createListSchema), async (req, res) => {
  try {
    const list = await WordList.create(req.body);
    res.status(201).json(transform(list));
  } catch (error) {
    res.status(500).json({ message: 'Error creating list' });
  }
});

router.get('/', async (req, res) => {
  try {
    const lists = await WordList.find().sort({ created_at: -1 }).lean();
    const data = await Promise.all(lists.map(async (list) => {
      const words = await Word.find({ 'ownedByLists.listId': list._id }).lean();
      const contexts = words.map(w => w.ownedByLists.find(c => c.listId.toString() === list._id.toString()));
      const progress = contexts.map(c => c?.learnedPoint || 0);
      
      return {
        ...transform(list),
        wordCount: words.length,
        averageProgress: words.length ? Math.round(progress.reduce((a, b) => a + b, 0) / words.length) : 0,
        masteredWords: progress.filter(p => p >= 80).length
      };
    }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lists' });
  }
});

router.get('/:id', validate(listParamsSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const list = await WordList.findById(id).lean();
    if (!list) return res.status(404).json({ message: 'List not found' });
    
    res.json(transform(list));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching list' });
  }
});

router.get('/:id/local-stats', validate(listParamsSchema), async (req, res) => {
  try {
    const { id } = req.params;

    const [exerciseCount, quizCount] = await Promise.all([
      Exercise.countDocuments({ listId: id }),
      Quiz.countDocuments({ listId: id })
    ]);

    res.json({ exerciseCount, quizCount });
  } catch (error) {
    console.error('Error fetching local stats:', error);
    res.status(500).json({ message: 'Error fetching local stats' });
  }
});

router.put('/:id', validate(updateListSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const list = await WordList.findByIdAndUpdate(id, req.body, { new: true, lean: true });
    if (!list) return res.status(404).json({ message: 'List not found' });
    
    res.json(transform(list));
  } catch (error) {
    res.status(500).json({ message: 'Error updating list' });
  }
});

router.delete('/:id', validate(listParamsSchema), async (req, res) => {
  try {
    const { id } = req.params;

    // Step 1: Pull the list reference from all associated words
    await Word.updateMany({ 'ownedByLists.listId': id }, { $pull: { ownedByLists: { listId: id } } });

    // Step 2: Delete words that are now orphaned (belong to no lists)
    await Word.deleteMany({ 'ownedByLists.0': { $exists: false } });

    // Step 3: Delete the list itself
    const deletedList = await WordList.findByIdAndDelete(id);
    if (!deletedList) {
      return res.status(404).json({ message: 'List not found' });
    }

    // Step 4: Also delete associated exercises and quizzes
    await Exercise.deleteMany({ listId: id });
    await Quiz.deleteMany({ listId: id });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting list and associated data:', error);
    res.status(500).json({ message: 'Error deleting list' });
  }
});

router.post('/:id/import-exercises', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { exercises } = req.body;

    if (!exercises || !Array.isArray(exercises)) {
      return res.status(400).json({ message: 'Invalid request body: "exercises" array not found.' });
    }

    const exercisesWithListId = exercises.map(ex => ({ ...ex, listId: id }));

    await Exercise.insertMany(exercisesWithListId);

    res.status(201).json({
      message: `Successfully imported and saved ${exercises.length} exercises for list ${id}.`,
      wordCount: new Set(exercises.map((ex: any) => ex.word)).size,
      typeCounts: exercises.reduce((acc: any, ex: any) => {
        acc[ex.type] = (acc[ex.type] || 0) + 1;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('Error importing exercises:', error);
    res.status(500).json({ message: 'Error importing exercises' });
  }
});

router.post('/:id/import-quizzes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quizzes } = req.body;

    if (!quizzes || !Array.isArray(quizzes)) {
      return res.status(400).json({ message: 'Invalid request body: "quizzes" array not found.' });
    }

    const processedQuizzes = await Promise.all(quizzes.map(async (quiz) => {
      const word = await Word.findOne({ value: quiz.word, 'ownedByLists.listId': id }).lean();
      if (word) {
        return { ...quiz, listId: id, wordId: word._id };
      }
      return null;
    }));

    const validQuizzes = processedQuizzes.filter(q => q !== null);

    if (validQuizzes.length === 0) {
      return res.status(400).json({ message: 'No valid quizzes found for the words in this list.' });
    }

    await Quiz.insertMany(validQuizzes);

    res.status(201).json({
      message: `Successfully imported and saved ${validQuizzes.length} quizzes for list ${id}.`,
      wordCount: new Set(validQuizzes.map((q: any) => q.word)).size,
      typeCounts: validQuizzes.reduce((acc: any, q: any) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('Error importing quizzes:', error);
    res.status(500).json({ message: 'Error importing quizzes' });
  }
});

router.post('/:id/import-words', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { words } = req.body; // CORRECTED: Reverted to destructure the 'words' array from the body object
    const userId = req.headers['user-id'] as string;

    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ message: 'Invalid request body: "words" array not found.' });
    }

    let addedCount = 0;
    for (const wordData of words) {
      const { word, definition, phonetic, partOfSpeech, examples } = wordData;
      if (!word || !definition) continue;

      const predefinedData = { definition, phonetic, partOfSpeech, examples };
      const addedWord = await wordService.addWordToList(id, word, userId, predefinedData);
      if(addedWord) {
        addedCount++;
      }
    }

    res.status(201).json({
      message: `Successfully imported and processed ${words.length} words. Added ${addedCount} new words to the list.`,
      addedCount,
      listId: id,
    });

  } catch (error) {
    console.error('Error importing words:', error);
    res.status(500).json({ message: 'Error importing words' });
  }
});

router.delete('/:id/quizzes', validate(listParamsSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await Quiz.deleteMany({ listId: id });
    res.status(200).json({ message: `Successfully deleted ${result.deletedCount} quizzes for list ${id}.` });
  } catch (error) {
    console.error('Error deleting quizzes:', error);
    res.status(500).json({ message: 'Error deleting quizzes' });
  }
});

router.get('/:id/pronunciation-audio', generatePronunciationAudio);

router.post(
  '/:id/batch-update-points',
  [
    body().isArray().withMessage('Request body must be an array.'),
    body('*.wordId').isMongoId().withMessage('Each update must have a valid wordId.'),
    body('*.change').isNumeric().withMessage('Each update must have a numeric change value.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const updates = req.body;

      const result = await wordService.batchUpdatePoints(id, updates);
      res.status(200).json({ message: 'Points updated successfully.', result });
    } catch (error) {
      console.error('Error batch updating points:', error);
      res.status(500).json({ message: 'Error batch updating points' });
    }
  }
);

export default router; 