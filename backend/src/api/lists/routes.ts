import { Router, Request, Response } from 'express';
import { validate } from 'echt';
import { WordList, IWordList } from './model';
import { Word } from '../words/model';
import { Exercise } from '../learn/exerciseModel';
import { createListSchema, listParamsSchema, updateListSchema } from './schemas';

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
    
    await Promise.all([
      Word.updateMany({ 'ownedByLists.listId': id }, { $pull: { ownedByLists: { listId: id } } }),
      Word.deleteMany({ ownedByLists: { $size: 0 } })
    ]);

    const deleted = await WordList.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'List not found' });
    
    res.status(204).send();
  } catch (error) {
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

export default router; 