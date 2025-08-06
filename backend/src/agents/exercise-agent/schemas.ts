import { z } from 'zod';

// Base schema with common fields
const BaseExerciseSchema = z.object({
  word: z.string().describe('The target word for the exercise'),
  question: z.string().describe('The exercise question presented to the user'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the exercise'),
  hint: z.string().optional().describe('An optional hint to guide the user'),
  feedback: z.string().optional().describe('Optional feedback provided after answering'),
});

// Schema for Multiple Choice questions
const MultipleChoiceExerciseSchema = BaseExerciseSchema.extend({
  type: z.literal('multiple_choice'),
  options: z.array(z.string()).length(4).describe('Four answer options'),
  optionLabels: z.array(z.string()).length(4).describe('Labels for the options, e.g., ["A", "B", "C", "D"]'),
  correctAnswer: z.string().describe('The label of the correct option (e.g., "A")'),
});

// Schema for Fill in the Blank questions
const FillBlankExerciseSchema = BaseExerciseSchema.extend({
  type: z.literal('fill_blank'),
  options: z.null(),
  optionLabels: z.null(),
  correctAnswer: z.string().describe('The single correct word to fill in the blank'),
});

// Schema for True/False questions
const TrueFalseExerciseSchema = BaseExerciseSchema.extend({
  type: z.literal('true_false'),
  options: z.tuple([z.literal('True'), z.literal('False')]).describe('Options must be ["True", "False"]'),
  optionLabels: z.tuple([z.string(), z.string()]).describe('Two labels, e.g., ["A", "B"]'),
  correctAnswer: z.string().describe('The label of the correct option'),
});

// Schema for Sentence Completion questions
const SentenceCompletionExerciseSchema = BaseExerciseSchema.extend({
  type: z.literal('sentence_completion'),
  options: z.array(z.string()).length(4).describe('Four word options to complete the sentence'),
  optionLabels: z.array(z.string()).length(4).describe('Labels for the options'),
  correctAnswer: z.string().describe('The label of the correct word'),
});

// Schema for Matching questions - THIS IS THE FIX
const MatchingExerciseSchema = BaseExerciseSchema.extend({
  type: z.literal('matching'),
  options: z.array(z.string()).min(4).describe('An array of words to be matched'),
  optionLabels: z.array(z.string()).min(4).describe('An array of definitions, shuffled'),
  correctAnswer: z.object({
    pairs: z.array(z.tuple([z.string(), z.string()])).min(4).describe('The correct word-definition pairs'),
  }).describe('An object containing the correct pairs'),
});

// Discriminated union for all exercise types
export const ExerciseSchema = z.discriminatedUnion('type', [
  MultipleChoiceExerciseSchema,
  FillBlankExerciseSchema,
  TrueFalseExerciseSchema,
  SentenceCompletionExerciseSchema,
  MatchingExerciseSchema,
]);

// Result schema containing an array of exercises
export const ExerciseResultSchema = z.object({
  exercises: z.array(ExerciseSchema).describe('Array of learning exercises'),
});

// Export inferred types
export type ExerciseResultType = z.infer<typeof ExerciseResultSchema>;
export type ExerciseType = z.infer<typeof ExerciseSchema>;

// Type for exercises with wordId added after generation
export type ExerciseWithId = ExerciseType & { wordId: string | null };
