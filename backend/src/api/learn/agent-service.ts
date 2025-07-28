import { getExercises } from '../../agents';
import { ExerciseResultType, ExerciseType } from '../../agents/exercise-agent/schemas';
import { generativeAIService } from '../../services/ai';
import * as fs from 'fs';
import * as path from 'path';

const exercisePromptPath = path.join(__dirname, '..', '..', 'agents', 'exercise-agent', 'prompt.md');
const exerciseSystemPrompt = fs.readFileSync(exercisePromptPath, 'utf-8');

export class LearnAgentService {
  async generateExercises(
    words: Array<{id: string, value: string, meaning: string}>, 
    context: string, 
    exerciseTypes: string[], 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<ExerciseType[]> {
    const wordsContext = words.map(w => `${w.value}: ${w.meaning}`).join('\n');
    const prompt = `Create learning exercises for these ${targetLanguage} vocabulary words for ${baseLanguage}-speaking learners:

${wordsContext}

Learning Context: "${context}"

Use these exercise types: ${exerciseTypes.join(', ')}
Create exactly ${words.length} exercises (one per word).`;
    
    const resultText = await generativeAIService.generateText({ prompt, systemPrompt: exerciseSystemPrompt });
    console.log('LearnAgentService: Raw resultText from AI:', resultText);
    // Extract JSON from markdown code block if present
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = resultText;
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    }
    console.log('LearnAgentService: jsonString after extraction:', jsonString);
    const result = JSON.parse(jsonString) as ExerciseResultType;
    return result.exercises;
  }
}

export const learnAgentService = new LearnAgentService();