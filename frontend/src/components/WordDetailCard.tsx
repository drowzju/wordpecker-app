import { useEffect, useState } from 'react';
import { Box, Text, Spinner, Center, IconButton, Flex, Heading, Tag, VStack, Divider } from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import { apiService } from '../services/api';
import { WordDetail } from '../types';
import { PronunciationButton } from './PronunciationButton';

interface WordDetailCardProps {
  wordId: string;
  onClose?: () => void; // Make onClose optional
}

export const WordDetailCard = ({ wordId, onClose }: WordDetailCardProps) => {
  const [details, setDetails] = useState<WordDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const data = await apiService.getWordDetails(wordId);
        setDetails(data);
      } catch (err) {
        setError('Failed to load word details.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (wordId) {
      fetchDetails();
    }
  }, [wordId]);

  if (isLoading) {
    return <Center p={5}><Spinner /></Center>;
  }

  if (error) {
    return <Center p={5}><Text color="red.500">{error}</Text></Center>;
  }

  if (!details) {
    return null;
  }

  return (
    <Box p={5} borderWidth="1px" borderRadius="lg" boxShadow="lg" bg="gray.700" mt={4} position="relative">
      {onClose && (
        <IconButton
          aria-label="Close word details"
          icon={<CloseIcon />}
          size="sm"
          position="absolute"
          top={2}
          right={2}
          onClick={onClose}
          variant="ghost"
        />
      )}
      <VStack align="stretch" spacing={4}>
        <Flex align="center">
          <Heading as="h3" size="lg" color="cyan.300">{details.value}</Heading>
          {details.phonetic && <Text fontSize="lg" color="gray.400" ml={4}>[{details.phonetic}]</Text>}
          <PronunciationButton word={details.value} />
        </Flex>
        
        {details.definition && (
            <Text fontSize="md" color="gray.300">{details.definition}</Text>
        )}

        {details.dictionary && details.dictionary.length > 0 && (
          <VStack align="stretch" spacing={3}>
            <Divider />
            <Heading as="h4" size="md" color="gray.400">Dictionary Definitions:</Heading>
            {details.dictionary.map((entry, index) => (
              <Box key={index}>
                <Text fontWeight="bold">{entry.partOfSpeech}</Text>
                {entry.definitions && entry.definitions.map((def, i) => (
                  <Text key={i} ml={4}>- {def.definition} {def.example && <em>"{def.example}"</em>}</Text>
                ))}
              </Box>
            ))}
          </VStack>
        )}

        {details.examples && details.examples.length > 0 && (
          <VStack align="stretch" spacing={3}>
            <Divider />
            <Heading as="h4" size="md" color="gray.400">Examples:</Heading>
            {details.examples.map((ex, index) => (
              <Box key={index}>
                <Text>{ex.sentence}</Text>
                <Text fontSize="sm" color="gray.500"><em>{ex.translation}</em></Text>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};