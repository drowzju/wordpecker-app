import mongoose from 'mongoose';
import { Exercise } from './exerciseModel';

const EXERCISE_COUNT = 15;

class LocalExerciseService {
  async getExercisesFromLocal(listId: string): Promise<any[]> {
    try {
      const exercises = await Exercise.aggregate([
        { $match: { listId: new mongoose.Types.ObjectId(listId) } },
        { $sample: { size: EXERCISE_COUNT } }
      ]);

      if (!exercises) {
        return [];
      }

      // Transform the exercises to match the expected format if necessary
      return exercises.map(ex => ({
        ...ex,
        id: ex._id.toString(), // Ensure id is a string if needed
      }));

    } catch (error) {
      console.error('Error fetching exercises from local database:', error);
      throw new Error('Failed to get exercises from local database.');
    }
  }
}

export const localExerciseService = new LocalExerciseService();
