import mongoose from 'mongoose';

// Corresponds to the DictionaryDocument structure in dictionaryService.ts
export interface IDictionary extends mongoose.Document {
  word: string;
  dictionary: any;
  stems?: string[];
  source: string;
  created_at: Date;
  updated_at: Date;
}

const dictionarySchema = new mongoose.Schema<IDictionary>(
  {
    word: { type: String, required: true, index: true },
    dictionary: mongoose.Schema.Types.Mixed,
    stems: { type: [String], index: true },
    source: { type: String, default: 'Merriam-Webster' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Dictionary = mongoose.model<IDictionary>('Dictionary', dictionarySchema);
