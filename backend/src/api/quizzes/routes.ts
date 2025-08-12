import { Router, Request, Response } from 'express';
import { validate } from 'echt';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Quiz } from '../quiz/quizModel';

const router = Router();

const objectIdSchema = {
  params: z.object({
    id: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid ID')
  })
};

router.delete('/:id', validate(objectIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Quiz.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.status(200).json({ message: `Successfully deleted quiz ${id}.` });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ message: 'Error deleting quiz' });
  }
});

export default router;
