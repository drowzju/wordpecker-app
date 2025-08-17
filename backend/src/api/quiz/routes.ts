import { Router, Request, Response } from 'express';
import { validate } from 'echt';
import { WordList } from '../lists/model';
import { Word } from '../words/model';
import { UserPreferences } from '../preferences/model';
import { QuestionType } from '../../types';
import { quizAgentService } from './agent-service';
import { localQuizService } from './local-quiz-service';
import { startQuizSchema, updatePointsSchema } from './schemas';

const router = Router();

const transformWords = (words: any[], listId: string) => 
  words.map(word => {
    const listContext = word.ownedByLists.find((ctx: any) => ctx.listId.toString() === listId);
    return {
      id: word._id.toString(),
      value: word.value,
      meaning: listContext?.meaning || '',
      learnedPoint: listContext?.learnedPoint || 0
    };
  });

const selectWordsForQuiz = (words: any[], count: number) => {
  if (words.length <= count) {
    return words;
  }

  // Calculate weights, giving higher probability to words with lower learnedPoint
  const weightedWords = words.map(word => ({
    ...word,
    // Weight: 101 - learnedPoint. Lower points get higher weight.
    weight: 101 - word.learnedPoint
  }));

  const totalWeight = weightedWords.reduce((sum, word) => sum + word.weight, 0);
  
  const selectedWords: any[] = [];
  const availableWords = [...weightedWords];

  while (selectedWords.length < count && availableWords.length > 0) {
    let random = Math.random() * totalWeight;
    let selectedIndex = -1;

    for (let i = 0; i < availableWords.length; i++) {
      random -= availableWords[i].weight;
      if (random < 0) {
        selectedIndex = i;
        break;
      }
    }

    if (selectedIndex !== -1) {
      const [selected] = availableWords.splice(selectedIndex, 1);
      selectedWords.push(selected);
    } else {
      // Fallback in case of rounding errors, though unlikely
      if(availableWords.length > 0) {
        selectedWords.push(availableWords.pop());
      }
    }
  }

  return selectedWords;
};


const getQuestionTypes = async (userId: string): Promise<QuestionType[]> => {
  if (!userId) return ['multiple_choice', 'fill_blank', 'true_false', 'sentence_completion'];
  
  const preferences = await UserPreferences.findOne({ userId });
  return preferences 
    ? Object.entries(preferences.exerciseTypes)
        .filter(([_, enabled]) => enabled)
        .map(([type]) => type as QuestionType)
    : ['multiple_choice', 'fill_blank', 'true_false', 'sentence_completion'];
};

router.post('/:listId/start', validate(startQuizSchema), async (req, res) => {
  try {
    const { listId } = req.params;
    const { mode } = req.body; // 'ai' or 'local'

    const list = await WordList.findById(listId).lean();
    if (!list) return res.status(404).json({ message: 'List not found' });

    let questions;
    let total_questions = await Word.countDocuments({ 'ownedByLists.listId': listId });

    if (mode === 'local') {
      try {
        questions = await localQuizService.getQuizzesFromLocal(listId);
      } catch (error: any) {
        return res.status(400).json({ message: error.message });
      }
    } else {
      const words = await Word.find({ 'ownedByLists.listId': listId }).lean();
      if (!words.length) return res.status(400).json({ message: 'List has no words' });

      const transformed = transformWords(words, listId);
      const selectedWords = selectWordsForQuiz(transformed, 5);
      const questionTypes = await getQuestionTypes(req.headers['user-id'] as string);
      questions = await quizAgentService.generateQuestions(selectedWords, list.context || 'General', questionTypes);
    }

    res.json({ 
      questions,
      total_questions,
      list: { id: list._id.toString(), name: list.name, context: list.context }
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ message: 'Error starting quiz' });
  }
});

router.post('/:listId/more', validate(startQuizSchema), async (req, res) => {
  try {
    const { listId } = req.params;
    const { mode } = req.body; // 'ai' or 'local'

    let questions;

    if (mode === 'local') {
      try {
        questions = await localQuizService.getQuizzesFromLocal(listId);
      } catch (error: any) {
        return res.status(400).json({ message: error.message });
      }
    } else {
      const [list, words] = await Promise.all([
        WordList.findById(listId).lean(),
        Word.find({ 'ownedByLists.listId': listId }).lean()
      ]);

      if (!list) return res.status(404).json({ message: 'List not found' });
      if (!words.length) return res.status(400).json({ message: 'List has no words' });

      const transformed = transformWords(words, listId);
      const selectedWords = selectWordsForQuiz(transformed, 5);
      const questionTypes = await getQuestionTypes(req.headers['user-id'] as string);
      questions = await quizAgentService.generateQuestions(selectedWords, list.context || 'General', questionTypes);
    }

    res.json({ questions });
  } catch (error) {
    console.error('Error getting more questions:', error);
    res.status(500).json({ message: 'Error getting more questions' });
  }
});

router.put('/:listId/learned-points', validate(updatePointsSchema), async (req, res) => {
  try {
    const { listId } = req.params;
    const { results } = req.body as { results: { wordId: string, correct: boolean }[] };

    // Step 1: Aggregate point changes for each wordId
    const pointChanges = new Map<string, number>();
    for (const result of results) {
      const change = result.correct ? 10 : -5;
      pointChanges.set(result.wordId, (pointChanges.get(result.wordId) || 0) + change);
    }

    // Step 2: Fetch all unique words in a single query
    const wordIds = Array.from(pointChanges.keys());
    const words = await Word.find({ '_id': { $in: wordIds } });

    // Step 3: Apply the aggregated changes and collect save promises
    const savePromises = words.map(word => {
      const context = word.ownedByLists.find(ctx => ctx.listId.toString() === listId);
      if (!context) {
        console.log(`Context not found for word: ${word._id} in list: ${listId}`);
        return Promise.resolve(); // Resolve promise to not break Promise.all
      }

      const pointChange = pointChanges.get(word._id.toString()) || 0;
      const currentPoints = context.learnedPoint || 0;
      const newPoints = Math.max(0, Math.min(100, currentPoints + pointChange));
      
      console.log(`Word ${word.value}: ${currentPoints} → ${newPoints} (Change: ${pointChange})`);
      context.learnedPoint = newPoints;
      
      return word.save();
    });

    // Step 4: Execute all save operations
    await Promise.all(savePromises);

    res.json({ message: 'Learned points updated successfully' });
  } catch (error) {
    console.error('Error updating learned points:', error);
    res.status(500).json({ message: 'Error updating learned points' });
  }
});

export default router;