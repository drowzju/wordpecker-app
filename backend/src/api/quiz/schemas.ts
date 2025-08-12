import { z } from 'zod';
import mongoose from 'mongoose';

const listIdParams = z.object({
  listId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid list ID')
});

export const listIdSchema = {
  params: listIdParams
};

export const startQuizSchema = {
  params: listIdParams,
  body: z.object({
    mode: z.enum(['ai', 'local']).optional()
  })
};

export const updatePointsSchema = {
  params: listIdParams,
  body: z.object({
    results: z.array(z.object({
      wordId: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid word ID'),
      correct: z.boolean()
    }))
  })
};