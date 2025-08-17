import mongoose from 'mongoose';
import { Quiz } from './quizModel';

const QUIZ_COUNT = 5;

class LocalQuizService {
  async getQuizzesFromLocal(listId: string, count: number = QUIZ_COUNT): Promise<any[]> {
    try {
      const listObjectId = new mongoose.Types.ObjectId(listId);

      const quizzes = await Quiz.aggregate([
        // Match quizzes for the specific list
        { $match: { listId: listObjectId } },

        // Lookup the word to get its details, especially learnedPoint
        {
          $lookup: {
            from: 'words',
            localField: 'wordId',
            foreignField: '_id',
            as: 'wordDetails'
          }
        },

        // If a quiz has a wordId but it's not found in Words (dangling ref), filter it out
        { $match: { $or: [{ wordId: { $exists: false } }, { "wordDetails.0": { $exists: true } }] } },

        // Add a weight field. Give a default medium weight if wordDetails is missing.
        {
          $addFields: {
            wordDetails: { $arrayElemAt: ["$wordDetails", 0] }
          }
        },
        {
          $addFields: {
            listContext: {
              $ifNull: [
                { 
                  $arrayElemAt: [
                    { 
                      $filter: { 
                        input: "$wordDetails.ownedByLists", 
                        as: "list", 
                        cond: { $eq: ["$list.listId", listObjectId] } 
                      } 
                    }, 
                    0
                  ]
                },
                null // Default if context not found
              ]
            }
          }
        },
        {
          $addFields: {
            // Weight: 101 - learnedPoint. Lower points get higher weight.
            // Words not yet practiced (learnedPoint=null) get the highest priority (defaulting to 0).
            weight: {
              $ifNull: ['$listContext.learnedPoint', 0] // Give high priority to words not yet learned
            }
          }
        },
        {
          $addFields: {
            weight: { $subtract: [101, "$weight"] }
          }
        },
        // Weighted random sampling using a random sort score
        {
          $addFields: {
            randomSortField: { $multiply: ['$weight', { $rand: {} }] }
          }
        },
        // Sort by the random score and take the top N
        { $sort: { randomSortField: -1 } },
        { $limit: count },

        // Clean up helper fields
        {
          $project: {
            wordDetails: 0,
            listContext: 0,
            weight: 0,
            randomSortField: 0
          }
        }
      ]);

      if (quizzes.length < count) {
        console.warn(`Not enough local quizzes found for this list. Found ${quizzes.length}, but required ${count}.`);
        // Not throwing an error, just returning what we have.
      }

      // Map _id to id for frontend compatibility
      return quizzes.map(q => {
        const { _id, ...rest } = q;
        return { ...rest, id: _id.toString() };
      });
    } catch (error) {
      console.error('Error fetching quizzes from local database:', error);
      throw new Error('Failed to get quizzes from local database.');
    }
  }
}

export const localQuizService = new LocalQuizService();
