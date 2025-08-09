import mongoose, { Schema, Document } from 'mongoose';

export interface IExercise extends Document {
  listId: mongoose.Types.ObjectId;
  word: string;
  type: 'multiple_choice' | 'fill_blank' | 'matching' | 'true_false' | 'sentence_completion';
  question: string;
  options: string[] | null;
  optionLabels: string[] | null;
  correctAnswer: any;
  difficulty: 'easy' | 'medium' | 'hard';
  hint: string;
  feedback: string;
  pairs: Array<[string, string]> | null;
}

const ExerciseSchema = new Schema<IExercise>({
  listId: { type: Schema.Types.ObjectId, ref: 'WordList', required: true },
  word: { type: String, required: true },
  type: { type: String, required: true, enum: ['multiple_choice', 'fill_blank', 'matching', 'true_false', 'sentence_completion'] },
  question: { type: String, required: true },
  options: { type: [String] },
  optionLabels: { type: [String] },
  correctAnswer: { type: Schema.Types.Mixed, required: true },
  difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'] },
  hint: { type: String },
  feedback: { type: String },
  pairs: { type: [[String, String]] },
}, { timestamps: true });

export const Exercise = mongoose.model<IExercise>('Exercise', ExerciseSchema);
