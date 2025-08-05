import { z } from 'zod';
import { DictionaryEntry } from '../../services/dictionaryService';

export const DefinitionResult = z.object({
  definition: z.string().describe('Clear, concise definition of the word'),
  dictionary: z.custom<DictionaryEntry[]>().optional().describe('Full dictionary entry from an external API.')
});

export type DefinitionResultType = z.infer<typeof DefinitionResult>;