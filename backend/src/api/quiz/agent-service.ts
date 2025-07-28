import { getQuiz } from '../../agents';
import { QuizResultType, Question, QuestionWithId } from '../../agents/quiz-agent/schemas';
import { generativeAIService } from '../../services/ai';
import * as fs from 'fs';
import * as path from 'path';

const quizPromptPath = path.join(__dirname, '..', '..', 'agents', 'quiz-agent', 'prompt.md');
const quizSystemPrompt = fs.readFileSync(quizPromptPath, 'utf-8');

export class QuizAgentService {
  async generateQuestions(
    words: Array<{id: string, value: string, meaning: string}>, 
    context: string, 
    questionTypes: string[]
  ): Promise<QuestionWithId[]> {
    const wordsContext = words.map(w => `${w.value}: ${w.meaning}`).join('\n');
    const prompt = `Create quiz questions for these vocabulary words:

${wordsContext}

Learning Context: "${context}"

Use these question types: ${questionTypes.join(', ')}
Create exactly ${words.length} questions (one per word).`;
    
    const resultText = await generativeAIService.generateText({ prompt, systemPrompt: quizSystemPrompt });
    console.log('QuizAgentService: Raw resultText from AI:', resultText);
    // Extract JSON from markdown code block if present
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = resultText;
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }
    console.log('QuizAgentService: jsonString after extraction:', jsonString);
    const result = JSON.parse(jsonString) as QuizResultType;
    
    // Map the returned exercises back to include word IDs
    const questionsWithIds = result.questions.map(question => {
      const matchingWord = words.find(w => w.value === question.word);
      return {
        ...question,
        wordId: matchingWord?.id || null
      };
    });
    
    return questionsWithIds;
  }
}

export const quizAgentService = new QuizAgentService();