import mongoose from 'mongoose';
import { Exercise } from './exerciseModel';
import { Word } from '../words/model';

const EXERCISE_COUNT = 15;

class LocalExerciseService {
  async getExercisesFromLocal(listId: string): Promise<any[]> {
    try {
      const exercises = await Exercise.aggregate([
        { $match: { listId: new mongoose.Types.ObjectId(listId) } },
        { $sample: { size: EXERCISE_COUNT } }
      ]);

      if (!exercises || exercises.length === 0) {
        return [];
      }

      const wordValues = exercises.map(ex => ex.word);
      const wordsFromDb = await Word.find({ value: { $in: wordValues } }).select('value _id').lean();
      const wordIdMap = new Map(wordsFromDb.map(w => [w.value, w._id.toString()]));

      return exercises.map(ex => ({
        ...ex,
        id: ex._id.toString(),
        wordId: wordIdMap.get(ex.word) || null,
      }));

    } catch (error) {
      console.error('Error fetching exercises from local database:', error);
      throw new Error('Failed to get exercises from local database.');
    }
  }
}

export const localExerciseService = new LocalExerciseService();
