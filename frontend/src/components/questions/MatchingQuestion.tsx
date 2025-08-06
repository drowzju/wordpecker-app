import {
  Text,
  Button,
  VStack,
  Box,
  Stack,
  Grid,
  GridItem,
  useColorModeValue,
  Alert,
  AlertIcon,
  Flex,
  Badge,
  HStack,
} from '@chakra-ui/react';
import { useState, useEffect, useMemo } from 'react';
import { Exercise, Question } from '../../types';

// This component now handles answer checking internally after submission

interface MatchingQuestionProps {
  question: Exercise | Question;
  selectedAnswer: string; // This will be managed internally but kept for prop consistency
  onAnswerChange: (answer: string) => void;
  isAnswered: boolean; // This prop now triggers the feedback display
  isCorrect?: boolean | null; // This will be calculated internally
}

export const MatchingQuestion: React.FC<MatchingQuestionProps> = ({
  question,
  onAnswerChange,
  isAnswered,
}) => {
  // State to hold the user's current pairings (word -> definition)
  const [userPairs, setUserPairs] = useState<Record<string, string>>({});
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  // A memoized map of the correct answers for efficient lookup
  const correctPairsMap = useMemo(() => {
    if (!question.correctAnswer?.pairs) return new Map();
    return new Map(question.correctAnswer.pairs.map(([word, def]) => [word, def]));
  }, [question.correctAnswer?.pairs]);

  // Memoized shuffled lists of words and definitions to prevent re-shuffling on re-renders
  const { shuffledWords, shuffledDefinitions } = useMemo(() => {
    const words = Array.from(correctPairsMap.keys());
    const definitions = Array.from(correctPairsMap.values());
    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
    return {
      shuffledWords: shuffle(words),
      shuffledDefinitions: shuffle(definitions),
    };
  }, [correctPairsMap]);

  // Reset component state when the question changes
  useEffect(() => {
    setUserPairs({});
    setSelectedWord(null);
  }, [question.word]);

  // Function to handle a new match or update an existing one
  const handleMatch = (word: string, definition: string) => {
    const newPairs = { ...userPairs };

    // If this definition is already matched to another word, unmatch it first
    Object.keys(newPairs).forEach(key => {
      if (newPairs[key] === definition) {
        delete newPairs[key];
      }
    });

    newPairs[word] = definition;
    setUserPairs(newPairs);
    setSelectedWord(null); // Reset selected word after matching

    // Inform parent about the change
    const answerString = Object.entries(newPairs).map(([w, d]) => `${w}:${d}`).join('|');
    onAnswerChange(answerString);
  };

  // Function to undo a match
  const handleUnmatch = (word: string) => {
    const newPairs = { ...userPairs };
    delete newPairs[word];
    setUserPairs(newPairs);
  };

  // Calculate results only when `isAnswered` becomes true
  const { correctCount, incorrectCount, overallCorrect } = useMemo(() => {
    if (!isAnswered) return { correctCount: 0, incorrectCount: 0, overallCorrect: null };
    
    let correct = 0;
    const totalPairs = correctPairsMap.size;

    for (const [word, userDef] of Object.entries(userPairs)) {
      if (correctPairsMap.get(word) === userDef) {
        correct++;
      }
    }
    const incorrect = totalPairs - correct;
    return { correctCount: correct, incorrectCount: incorrect, overallCorrect: incorrect === 0 };

  }, [isAnswered, userPairs, correctPairsMap]);

  // --- STYLING --- //
  const correctBg = useColorModeValue('green.100', 'green.800');
  const correctBorder = useColorModeValue('green.400', 'green.600');
  const incorrectBg = useColorModeValue('red.100', 'red.800');
  const incorrectBorder = useColorModeValue('red.400', 'red.600');
  const matchedBg = useColorModeValue('gray.200', 'gray.600');
  const matchedBorder = useColorModeValue('gray.400', 'gray.500');
  const selectedBorder = useColorModeValue('blue.400', 'blue.300');

  if (!question.correctAnswer?.pairs) {
    return <Text>No matching pairs available for this question.</Text>;
  }

  return (
    <VStack spacing={4} align="stretch">
      <Text fontSize="lg" textAlign="center" mb={2}>Match each word with its definition:</Text>
      <Text fontSize="sm" color="gray.400" textAlign="center">
        Click a word, then its definition. To change a match, click the word again.
      </Text>

      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
        {/* Words Column */}
        <GridItem>
          <Text fontWeight="bold" mb={3} color={useColorModeValue('blue.600', 'blue.300')}>Words:</Text>
          <Stack spacing={3} align="stretch">
            {shuffledWords.map((word) => {
              const userDefinition = userPairs[word];
              const isSelected = selectedWord === word;
              let bg = undefined;
              let borderColor = undefined;

              if (isAnswered) {
                const isCorrect = correctPairsMap.get(word) === userDefinition;
                bg = isCorrect ? correctBg : incorrectBg;
                borderColor = isCorrect ? correctBorder : incorrectBorder;
              } else {
                if (userDefinition) {
                  bg = matchedBg;
                  borderColor = matchedBorder;
                }
                if (isSelected) {
                  borderColor = selectedBorder;
                }
              }

              return (
                <Button
                  key={word}
                  variant="outline"
                  h="auto" minH="3.5rem" p={3} whiteSpace="normal" borderWidth={2}
                  bg={bg}
                  borderColor={borderColor}
                  onClick={() => {
                    if (isAnswered) return;
                    if (userDefinition) {
                      handleUnmatch(word);
                    } else {
                      setSelectedWord(isSelected ? null : word);
                    }
                  }}
                  isDisabled={isAnswered}
                >
                  {word}
                </Button>
              );
            })}
          </Stack>
        </GridItem>

        {/* Definitions Column */}
        <GridItem>
          <Text fontWeight="bold" mb={3} color={useColorModeValue('green.600', 'green.300')}>Definitions:</Text>
          <Stack spacing={3} align="stretch">
            {shuffledDefinitions.map((definition) => {
              const matchedWord = Object.keys(userPairs).find(key => userPairs[key] === definition);
              let bg = undefined;
              let borderColor = undefined;

              if (isAnswered && matchedWord) {
                const isCorrect = correctPairsMap.get(matchedWord) === definition;
                bg = isCorrect ? correctBg : incorrectBg;
                borderColor = isCorrect ? correctBorder : incorrectBorder;
              } else if (matchedWord) {
                bg = matchedBg;
                borderColor = matchedBorder;
              }

              return (
                <Button
                  key={definition}
                  variant="outline"
                  h="auto" minH="3.5rem" p={3} whiteSpace="normal" borderWidth={2}
                  bg={bg}
                  borderColor={borderColor}
                  onClick={() => {
                    if (selectedWord && !isAnswered) {
                      handleMatch(selectedWord, definition);
                    }
                  }}
                  isDisabled={isAnswered || !selectedWord || !!matchedWord}
                >
                  {definition}
                </Button>
              );
            })}
          </Stack>
        </GridItem>
      </Grid>

      {/* Feedback Section shown after answering */}
      {isAnswered && (
        <Box mt={4} p={4} bg={useColorModeValue('gray.100', 'gray.800')} borderRadius="md">
          <Alert status={overallCorrect ? 'success' : 'error'} borderRadius="md" mb={4}>
            <AlertIcon />
            <Flex justify="space-between" w="100%">
              <Text fontWeight="bold">{overallCorrect ? 'All Correct!' : 'Review Needed'}</Text>
              <HStack>
                <Badge colorScheme="green">Correct: {correctCount}</Badge>
                <Badge colorScheme="red">Incorrect: {incorrectCount}</Badge>
              </HStack>
            </Flex>
          </Alert>
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold" mb={1}>Correct Matches:</Text>
            {question.correctAnswer.pairs.map(([word, def], idx) => (
              <Text key={idx} fontSize="sm" color={useColorModeValue('green.700', 'green.300')}>
                <strong>{word}</strong> → {def}
              </Text>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
};