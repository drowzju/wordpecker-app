import { z } from 'zod';

export const SentenceExample = z.object({
  sentence: z.string().describe('Example sentence in target language'),
  translation: z.string().nullable().describe('Translation in base language'),
  context_note: z.string().describe('Explanation of how the word is used')
});

export const ExamplesResult = z.object({
  examples: z.array(SentenceExample).describe('Array of sentence examples')
});

export const ExampleDetails = z.object({
  translation: z.string().describe('Translation in base language'),
  context_and_usage: z.string().describe('Explanation of how the word is used')
});

export type SentenceExampleType = z.infer<typeof SentenceExample>;
export type ExamplesResultType = z.infer<typeof ExamplesResult>;
export type ExampleDetailsType = z.infer<typeof ExampleDetails>;