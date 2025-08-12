
import mongoose, { Document, Schema } from 'mongoose';

export interface IQuiz extends Document {
  word: string;
  type: string;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: any[];
  optionLabels?: string[];
  correctAnswer: any;
  hint?: string;
  feedback?: string;
  listId: Schema.Types.ObjectId;
  wordId?: Schema.Types.ObjectId;
}

const QuizSchema = new Schema<IQuiz>({
  word: { type: String, required: true },
  type: { type: String, required: true },
  question: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  options: { type: Schema.Types.Mixed },
  optionLabels: { type: [String] },
  correctAnswer: { type: Schema.Types.Mixed, required: true },
  hint: { type: String },
  feedback: { type: String },
  listId: { type: Schema.Types.ObjectId, ref: 'WordList', required: true },
  wordId: { type: Schema.Types.ObjectId, ref: 'Word' }
});

export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);
