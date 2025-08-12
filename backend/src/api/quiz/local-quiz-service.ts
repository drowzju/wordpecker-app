import mongoose from 'mongoose';
import { Quiz } from './quizModel';

const QUIZ_COUNT = 5;

class LocalQuizService {
  async getQuizzesFromLocal(listId: string, count: number = QUIZ_COUNT): Promise<any[]> {
    try {
      const quizzes = await Quiz.aggregate([
        { $match: { listId: new mongoose.Types.ObjectId(listId) } },
        { $sample: { size: count } }
      ]);

      if (quizzes.length < count) {
        throw new Error(`Not enough local quizzes found for this list. Found ${quizzes.length}, but required ${count}.`);
      }

      return quizzes;
    } catch (error) {
      console.error('Error fetching quizzes from local database:', error);
      throw new Error('Failed to get quizzes from local database.');
    }
  }
}

export const localQuizService = new LocalQuizService();
