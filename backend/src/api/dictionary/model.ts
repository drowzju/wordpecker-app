import mongoose from 'mongoose';

// This interface represents the structure of the dictionary entries in the database
export interface IDictionary extends mongoose.Document {
  word: string;
  entries: any; // The structure from the JSON file is { [PART_OF_SPEECH]: [definition1, ...] }
}

const dictionarySchema = new mongoose.Schema<IDictionary>({
  word: { type: String, required: true, index: true, unique: true },
  entries: mongoose.Schema.Types.Mixed,
});

export const Dictionary = mongoose.model<IDictionary>('Dictionary', dictionarySchema);
