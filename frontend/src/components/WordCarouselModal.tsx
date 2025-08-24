import { useEffect, useState, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  Flex,
  Text,
  InputGroup,
  InputRightElement,
  Spinner
} from '@chakra-ui/react';
import { Word } from '../types';

interface WordCarouselModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: Word[];
}

// This utility function is adapted from the backend logic to find a valid audio URL.
const extractAudioUrl = (dictionaryData: any): string | null => {
  if (!dictionaryData || !Array.isArray(dictionaryData)) {
    return null;
  }

  for (const entry of dictionaryData) {
    if (entry.phonetics && Array.isArray(entry.phonetics)) {
      for (const phonetic of entry.phonetics) {
        if (phonetic.audio && typeof phonetic.audio === 'string' && phonetic.audio.startsWith('http')) {
          return phonetic.audio;
        }
      }
    }
    if (entry.dictionary) {
      const nestedUrl = extractAudioUrl(entry.dictionary);
      if (nestedUrl) {
        return nestedUrl;
      }
    }
  }

  return null;
};

const extractPhonetic = (dictionaryData: any): string | null => {
  if (!dictionaryData || !Array.isArray(dictionaryData)) {
    return null;
  }
  for (const entry of dictionaryData) {
    if (entry.phonetics && Array.isArray(entry.phonetics)) {
      for (const phonetic of entry.phonetics) {
        if (phonetic.text) {
          return phonetic.text;
        }
      }
    }
    if (entry.dictionary) {
      const nestedPhonetic = extractPhonetic(entry.dictionary);
      if (nestedPhonetic) {
        return nestedPhonetic;
      }
    }
  }
  return null;
};

export const WordCarouselModal = ({ isOpen, onClose, words }: WordCarouselModalProps) => {
  const [wordsWithAudio, setWordsWithAudio] = useState<(Word & { audioUrl: string })[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | '' | 'revealed'>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Effect to filter words and reset state when the modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const filtered = words
        .map(word => ({
          ...word,
          audioUrl: extractAudioUrl(word.dictionary),
        }))
        .filter(word => word.audioUrl) as (Word & { audioUrl: string })[];
      
      setWordsWithAudio(filtered);
      setCurrentWordIndex(0);
      setInputValue('');
      setFeedback('');
      setIsLoading(false);
    }
  }, [isOpen, words]);

  const playCurrentWordAudio = () => {
    if (wordsWithAudio.length > 0 && currentWordIndex < wordsWithAudio.length) {
      const word = wordsWithAudio[currentWordIndex];
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(word.audioUrl);
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  };

  // Effect to play audio when the current word changes
  useEffect(() => {
    if (isOpen && wordsWithAudio.length > 0) {
      // Use a timeout to ensure the modal transition is complete before playing audio
      const delay = currentWordIndex === 0 ? 300 : 800; // Longer delay for subsequent words
      setTimeout(() => playCurrentWordAudio(), delay);
    }
  }, [isOpen, currentWordIndex, wordsWithAudio]);

  const handleNextWord = () => {
    if (currentWordIndex < wordsWithAudio.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      setInputValue('');
      setFeedback('');
    } else {
      onClose(); // Close the modal if it was the last word
    }
  };

  const handleSubmit = () => {
    if (!inputValue || feedback === 'correct' || feedback === 'revealed') return;

    const currentWord = wordsWithAudio[currentWordIndex].value.toLowerCase();
    if (inputValue.trim().toLowerCase() === currentWord) {
      setFeedback('correct');
      setTimeout(handleNextWord, 1200); // Correct: move to next word automatically
    } else {
      setFeedback('incorrect');
      setTimeout(() => {
        setFeedback('revealed'); // Incorrect: show the answer
      }, 1200);
    }
  };

  const handleShowWord = () => {
    setFeedback('revealed');
  };

  const renderBody = () => {
    if (isLoading) {
      return <Spinner />;
    }
    if (wordsWithAudio.length === 0) {
      return <Text color="yellow.400">No words with audio found in this list.</Text>;
    }

    let bodyContent;
    if (feedback === 'revealed') {
      const currentWord = wordsWithAudio[currentWordIndex];
      const phonetic = extractPhonetic(currentWord.dictionary);
      return (
        <Flex direction="column" align="start" justify="center" w="full">
          <Text fontSize="2xl" color="cyan.300" fontWeight="bold">{currentWord.value}</Text>
          {phonetic && <Text fontSize="lg" color="gray.300" mt={1}>{phonetic}</Text>}
          <Text fontSize="md" color="gray.400" mt={3}>{currentWord.meaning}</Text>
        </Flex>
      );
    } else if (feedback === 'incorrect') {
      bodyContent = <Text color="red.400" fontSize="xl">Incorrect!</Text>;
    } else if (feedback === 'correct') {
      bodyContent = <Text color="green.400" fontSize="xl">Correct!</Text>;
    } else {
      bodyContent = (
        <Text textAlign="center" fontSize="lg" color="gray.400">
          Playing word {currentWordIndex + 1} of {wordsWithAudio.length}
        </Text>
      );
    }

    return (
      <Flex direction="column" align="center" justify="center" h="80px">
        {bodyContent}
      </Flex>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent bg="slate.800" color="white">
        <ModalHeader>
          <Flex justify="space-between" align="center">
            <Text>Listen and Type</Text>
            <Flex gap={2}>
              <Button colorScheme="blue" variant="outline" size="sm" onClick={playCurrentWordAudio} isDisabled={feedback === 'revealed'}>
                Replay
              </Button>
              <Button colorScheme="green" variant="outline" size="sm" onClick={handleShowWord} isDisabled={feedback === 'revealed'}>
                Show Word
              </Button>
            </Flex>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={8} display="flex" justifyContent="center">
          {renderBody()}
        </ModalBody>
        <ModalFooter>
          {feedback === 'revealed' ? (
            <Button onClick={handleNextWord} colorScheme="blue" w="full">
              Continue
            </Button>
          ) : (
            <InputGroup>
              <Input 
                placeholder="Type the word you hear"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (feedback === 'incorrect') setFeedback('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                isInvalid={feedback === 'incorrect'}
                isReadOnly={feedback === 'correct'}
                focusBorderColor={feedback === 'correct' ? 'green.400' : 'blue.300'}
                borderColor={feedback === 'incorrect' ? 'red.500' : 'slate.600'}
              />
              <InputRightElement width="4.5rem">
                <Button h="1.75rem" size="sm" onClick={handleSubmit} isLoading={feedback === 'correct'} loadingText="Next">
                  Submit
                </Button>
              </InputRightElement>
            </InputGroup>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};