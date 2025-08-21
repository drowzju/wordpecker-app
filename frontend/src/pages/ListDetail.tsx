import { 
  Box, 
  Button, 
  Text, 
  Flex, 
  IconButton, 
  useDisclosure, 
  Container, 
  Heading, 
  Icon,
  useToast,
  Spinner,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Select,
  FormControl,
  FormLabel,
  VStack,
  SimpleGrid,
  Progress
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Word, WordList } from '../types';
import { ArrowBackIcon, DeleteIcon } from '@chakra-ui/icons';
import { FaGraduationCap, FaGamepad, FaPlus, FaBookOpen, FaDownload, FaUpload } from 'react-icons/fa';
import { GiTreeBranch } from 'react-icons/gi';
import { AddWordModal } from '../components/AddWordModal';
import { ProgressIndicator, OverallProgress } from '../components/ProgressIndicator';
import { apiService } from '../services/api';
import { UserPreferences } from '../types';
import { Switch } from '@chakra-ui/react';

// Dynamic color generator
const generateColor = (word: string) => {
  const hue = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 70%, 25%)`;
};

// Generate hover color (slightly lighter version)
const generateHoverColor = (word: string) => {
  if (!word) return `hsl(0, 70%, 30%)`;
  const hue = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 70%, 30%)`;
};

const MotionBox = motion(Box);

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const sortWords = (words: Word[]): Word[] => {
  return [...words].sort((a, b) => {
    const lpA = a.learnedPoint || 0;
    const lpB = b.learnedPoint || 0;

    if (lpA !== lpB) {
      return lpA - lpB;
    }

    try {
      // Assuming id is a MongoDB ObjectId, the first 8 hex chars are a timestamp.
      const timestampA = parseInt(a.id.substring(0, 8), 16);
      const timestampB = parseInt(b.id.substring(0, 8), 16);
      return timestampB - timestampA; // Sort by newest first
    } catch (error) {
      // Fallback if id is not in the expected format
      return 0;
    }
  });
};

export const ListDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [list, setList] = useState<WordList | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lightReadingLevel, setLightReadingLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [generatingReading, setGeneratingReading] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [exerciseMode, setExerciseMode] = useState<'ai' | 'local'>('local');
  const [localStats, setLocalStats] = useState<{ exerciseCount: number, quizCount: number } | null>(null);
  
  // New state for audio generation
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState({ progress: 0, message: '' });
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  const { 
    isOpen: isReadingModalOpen, 
    onOpen: onReadingModalOpen, 
    onClose: onReadingModalClose 
  } = useDisclosure();

  useEffect(() => {
    const fetchListDetails = async () => {
      if (!id) return;
      
      try {
        const [listData, wordsData, preferencesData, statsData] = await Promise.all([
          apiService.getList(id),
          apiService.getWords(id),
          apiService.getPreferences(),
          apiService.getListLocalStats(id)
        ]);
        
        setList(listData);
        setWords(sortWords(wordsData));
        setUserPreferences(preferencesData);
        setLocalStats(statsData);
      } catch (error) {
        console.error('Error fetching list details:', error);
        toast({
          title: 'Error loading list',
          description: 'Please try again later',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/lists');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListDetails();
  }, [id, navigate, toast]);

  const handleAddWord = async (word: string): Promise<void> => {
    try {
      const newWord = await apiService.addWord(id!, word);
      setWords(prevWords => sortWords([newWord, ...prevWords]));
      toast({
        title: 'Word added successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      console.error('Error adding word:', error);
      toast({
        title: 'Error adding word',
        description: 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteWord = async (wordId: string) => {
    try {
      await apiService.deleteWord(id!, wordId);
      setWords(prevWords => prevWords.filter(word => word.id !== wordId));
      toast({
        title: 'Word deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting word:', error);
      toast({
        title: 'Error deleting word',
        description: 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteList = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this list? This action cannot be undone.')) return;
    
    try {
      await apiService.deleteList(id);
      toast({
        title: 'List deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/lists');
    } catch (error) {
      console.error('Error deleting list:', error);
      toast({
        title: 'Error deleting list',
        description: 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleGenerateLightReading = async () => {
    if (!id || words.length === 0) return;
    
    setGeneratingReading(true);
    try {
      const reading = await apiService.generateLightReading(id, lightReadingLevel);
      
      navigate(`/reading/${id}`, { 
        state: { 
          reading, 
          list, 
          level: lightReadingLevel 
        } 
      });
      
      onReadingModalClose();
    } catch (error) {
      console.error('Error generating light reading:', error);
      toast({
        title: 'Error generating reading',
        description: 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setGeneratingReading(false);
    }
  };

  const handleGenerateAudio = () => {
    if (!id) return;

    setIsGeneratingAudio(true);
    setAudioProgress({ progress: 0, message: 'Starting...' });
    setFinalAudioUrl(null);

    const url = `${apiService.getBaseUrl()}/api/lists/${id}/pronunciation-audio`;
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setAudioProgress({ progress: data.progress, message: data.message });

        if (data.downloadUrl) {
            setFinalAudioUrl(data.downloadUrl);
            setIsGeneratingAudio(false);
            eventSource.close();
        }
    };

    eventSource.addEventListener('error', (event: any) => {
        const data = JSON.parse(event.data);
        toast({
            title: 'Error Generating Audio',
            description: data.message || 'An unknown error occurred.',
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
        setIsGeneratingAudio(false);
        eventSource.close();
    });

    eventSource.onerror = (err) => {
        console.error('EventSource failed:', err);
        toast({
            title: 'Connection Error',
            description: 'Could not connect to the server for audio generation.',
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
        setIsGeneratingAudio(false);
        eventSource.close();
    };
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const toastId = "import-toast";
    toast({
      id: toastId,
      title: 'Importing Files...',
      description: `Processing ${files.length} file(s).`,
      status: 'info',
      duration: null, // Persist until manually closed or updated
      isClosable: true,
    });

    const readFileAsPromise = (file: File): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result;
            if (typeof content !== 'string') {
              return reject(new Error(`File content in ${file.name} is not a string.`));
            }
            const data = JSON.parse(content);
            if (!data || !Array.isArray(data.exercises)) {
              return reject(new Error(`Invalid JSON format in ${file.name}: "exercises" array not found.`));
            }
            resolve(data.exercises);
          } catch (error: any) {
            reject(new Error(`Error parsing ${file.name}: ${error.message}`));
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
      });
    };

    try {
      const fileReadPromises = Array.from(files).map(readFileAsPromise);
      const exercisesFromAllFiles = await Promise.all(fileReadPromises);
      const allExercises = exercisesFromAllFiles.flat();

      if (!id) {
        throw new Error('No list ID found.');
      }

      if (allExercises.length > 0) {
        const response = await apiService.importExercises(id, allExercises);
        toast.update(toastId, {
          title: 'Exercises Imported Successfully',
          description: `Imported ${allExercises.length} exercises for ${response.wordCount} words from ${files.length} files. Type counts: ${JSON.stringify(response.typeCounts)}`,
          status: 'success',
          duration: 9000,
        });
      } else {
        toast.update(toastId, {
          title: 'No Exercises Found',
          description: 'The selected files did not contain any valid exercises.',
          status: 'warning',
          duration: 5000,
        });
      }

    } catch (error: any) {
      console.error('Error importing files:', error);
      toast.update(toastId, {
        title: 'Error Importing Files',
        description: error.message || 'Please check the file formats and try again.',
        status: 'error',
        duration: 9000,
      });
    }

    // Reset the file input so the same files can be selected again
    event.target.value = '';
  };

  const quizFileInputRef = useRef<HTMLInputElement>(null);

  const handleQuizImportClick = () => {
    quizFileInputRef.current?.click();
  };

  const handleQuizFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const toastId = "import-toast";
    toast({
      id: toastId,
      title: 'Importing Files...',
      description: `Processing ${files.length} file(s).`,
      status: 'info',
      duration: null, // Persist until manually closed or updated
      isClosable: true,
    });

    const readFileAsPromise = (file: File): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result;
            if (typeof content !== 'string') {
              return reject(new Error(`File content in ${file.name} is not a string.`));
            }
            const data = JSON.parse(content);
            if (!data || !Array.isArray(data.questions)) {
              return reject(new Error(`Invalid JSON format in ${file.name}: "questions" array not found.`));
            }
            resolve(data.questions);
          } catch (error: any) {
            reject(new Error(`Error parsing ${file.name}: ${error.message}`));
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
      });
    };

    try {
      const fileReadPromises = Array.from(files).map(readFileAsPromise);
      const quizzesFromAllFiles = await Promise.all(fileReadPromises);
      const allQuizzes = quizzesFromAllFiles.flat();

      if (!id) {
        throw new Error('No list ID found.');
      }

      if (allQuizzes.length > 0) {
        const response = await apiService.importQuizzes(id, allQuizzes);
        toast.update(toastId, {
          title: 'Quizzes Imported Successfully',
          description: `Imported ${allQuizzes.length} quizzes for ${response.wordCount} words from ${files.length} files. Type counts: ${JSON.stringify(response.typeCounts)}`,
          status: 'success',
          duration: 9000,
        });
      } else {
        toast.update(toastId, {
          title: 'No Quizzes Found',
          description: 'The selected files did not contain any valid quizzes.',
          status: 'warning',
          duration: 5000,
        });
      }

    } catch (error: any) {
      console.error('Error importing files:', error);
      toast.update(toastId, {
        title: 'Error Importing Files',
        description: error.message || 'Please check the file formats and try again.',
        status: 'error',
        duration: 9000,
      });
    }

    // Reset the file input so the same files can be selected again
    event.target.value = '';
  };

  const wordFileInputRef = useRef<HTMLInputElement>(null);

  const handleWordImportClick = () => {
    wordFileInputRef.current?.click();
  };

  const handleWordFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const toastId = "word-import-toast";
    toast({
      id: toastId,
      title: 'Importing Words...',
      description: `Processing ${file.name}.`,
      status: 'info',
      duration: null,
      isClosable: true,
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          throw new Error('File content is not a string.');
        }
        const wordsToImport = JSON.parse(content);
        if (!Array.isArray(wordsToImport)) {
          throw new Error('Invalid JSON format: root should be an array.');
        }

        if (!id) {
          throw new Error('No list ID found.');
        }

        const response = await apiService.importWords(id, wordsToImport);
        
        // Refetch words to update the list
        const wordsData = await apiService.getWords(id);
        setWords(sortWords(wordsData));

        toast.update(toastId, {
          title: 'Words Imported Successfully',
          description: `${response.addedCount} words were added to the list.`,
          status: 'success',
          duration: 5000,
        });

      } catch (error: any) {
        console.error('Error importing word file:', error);
        toast.update(toastId, {
          title: 'Error Importing File',
          description: error.message || 'Please check the file format and try again.',
          status: 'error',
          duration: 9000,
        });
      } finally {
        // Reset the file input
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.onerror = (error) => {
      toast.update(toastId, {
        title: 'Error Reading File',
        description: reader.error?.message ?? 'An unknown error occurred while reading the file.', 
        status: 'error',
        duration: 9000,
      });
    };
    reader.readAsText(file);
  };

  const handleExportList = () => {
    if (!list || !userPreferences) {
      toast({
        title: 'Cannot export list',
        description: 'List data is not fully loaded yet.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // 1. Gather and structure the data
    const exportData = {
      words: words.map(({ id, value, meaning }) => ({ id, value, meaning })),
      context: list.context || '',
      // Assumes exerciseTypes is an object like { "multiple-choice": true, ... }
      // Extracts the keys for the enabled exercise types.
      exerciseTypes: userPreferences.exerciseTypes 
        ? Object.entries(userPreferences.exerciseTypes)
            .filter(([, isEnabled]) => isEnabled)
            .map(([key]) => key)
        : [],
      baseLanguage: userPreferences.baseLanguage || 'en',
      targetLanguage: userPreferences.targetLanguage || 'es',
    };

    // 2. Convert the object to a formatted JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    // 3. Create a Blob from the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 4. Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);

    // 5. Create a temporary anchor element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    const fileName = `${list.name.replace(/\s+/g, '_').toLowerCase()}_export.json`;
    link.download = fileName;
    document.body.appendChild(link);
    
    // 6. Trigger the download and clean up
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'List exported successfully!',
      description: `Saved as ${fileName}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  if (isLoading) {
    return (
      <Center h="calc(100vh - 64px)">
        <Spinner size="xl" color="green.400" thickness="4px" />
      </Center>
    );
  }

  if (!list) {
    return (
      <Container maxW="container.xl" py={8} px={{ base: 4, md: 8 }}>
        <Box textAlign="center" py={10}>
          <Text>List not found</Text>
          <Button 
            onClick={() => navigate('/lists')} 
            mt={4}
            colorScheme="green"
          >
            Back to Lists
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8} px={{ base: 4, md: 8 }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        style={{ display: 'none' }}
        accept=".json"
        multiple
      />
      <input
        type="file"
        ref={quizFileInputRef}
        onChange={handleQuizFileImport}
        style={{ display: 'none' }}
        accept=".json"
        multiple
      />
      <input
        type="file"
        ref={wordFileInputRef}
        onChange={handleWordFileImport}
        style={{ display: 'none' }}
        accept=".json"
      />
      <MotionBox
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        transition={{ duration: 0.5 }}
        p={4}
      >
        <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <Flex align="center" gap={2}>
            <IconButton
              aria-label="Go back"
              icon={<ArrowBackIcon />}
              variant="ghost"
              onClick={() => navigate(-1)}
              size="lg"
              _hover={{
                transform: 'translateY(-2px)',
                color: 'green.400'
              }}
              transition="all 0.2s"
            />
            <Heading 
              as="h1" 
              size="xl"
              bgGradient="linear(to-r, green.400, brand.400)"
              bgClip="text"
              display="flex"
              alignItems="center"
              gap={2}
            >
              <Icon 
                as={GiTreeBranch} 
                color="green.400"
                style={{ animation: 'sparkle 3s ease infinite' }}
              />
              {list.name}
            </Heading>
          </Flex>
          <Flex align="center" gap={2} flexWrap="wrap" justify={{ base: 'center', md: 'flex-end' }}>
            <FormControl display="flex" alignItems="center" w="auto">
              <FormLabel htmlFor="exercise-mode" mb="0" mr={2} whiteSpace="nowrap" color="blue.200">
                Use Local
              </FormLabel>
              <Switch id="exercise-mode" isChecked={exerciseMode === 'local'} onChange={() => setExerciseMode(prev => prev === 'ai' ? 'local' : 'ai')} />
            </FormControl>
            {localStats && (
              <Text fontSize="sm" color="blue.200">
                (Ex: {localStats.exerciseCount} | Qz: {localStats.quizCount})
              </Text>
            )}
            <Button
              variant="ghost"
              colorScheme="green"
              leftIcon={<FaUpload />}
              onClick={handleImportClick}
              size="md"
            >
              Ex.
            </Button>
            <Button
              variant="ghost"
              colorScheme="orange"
              leftIcon={<FaUpload />}
              onClick={handleQuizImportClick}
              size="md"
            >
              Qz.
            </Button>
            <Button
              variant="ghost"
              colorScheme="teal"
              leftIcon={<FaUpload />}
              onClick={handleWordImportClick}
              size="md"
            >
              Word
            </Button>
            <Button
              variant="ghost"
              colorScheme="blue"
              leftIcon={<FaDownload />}
              onClick={handleExportList}
              isDisabled={!list || !userPreferences}
              size="md"
            >
              List
            </Button>
            <Button
              variant="ghost"
              colorScheme="red"
              leftIcon={<DeleteIcon />}
              onClick={handleDeleteList}
              size="md"
            >
              
            </Button>
          </Flex>
        </Flex>

        {words.length > 0 && (
          <Box mb={6}>
            <OverallProgress words={words} size="md" />
          </Box>
        )}
        
        <Flex 
          justify="space-between" 
          align="center" 
          mb={6}
          direction={{ base: 'column', md: 'row' }}
          gap={4}
        >
          <Box maxW="container.md">
            <Text color="gray.400" fontSize="lg">{list.description}</Text>
            {list.context && (
              <Text color="gray.500" fontSize="md" mt={2}>
                Context: {list.context}
              </Text>
            )}
          </Box>
          <Flex gap={3} flexWrap="wrap" justify={{ base: 'center', md: 'flex-end' }} alignItems="center">
            <Button 
              variant="ghost" 
              leftIcon={<FaGraduationCap />}
              colorScheme="green"
              _hover={{ transform: 'translateY(-2px)' }}
              transition="all 0.2s"
              size="lg"
              isDisabled={words.length === 0}
              onClick={() => navigate(`/learn/${list!.id}`, { state: { list, mode: exerciseMode } })}
            >
              Learn
            </Button>
            <Button 
              variant="ghost"
              leftIcon={<FaGamepad />}
              colorScheme="orange"
              _hover={{ transform: 'translateY(-2px)' }}
              transition="all 0.2s"
              size="lg"
              isDisabled={words.length === 0}
              onClick={() => navigate(`/quiz/${list!.id}`, { state: { list, mode: exerciseMode } })}
            >
              Quiz
            </Button>
            <Button 
              variant="ghost"
              leftIcon={<FaBookOpen />}
              colorScheme="purple"
              _hover={{ transform: 'translateY(-2px)' }}
              transition="all 0.2s"
              size="lg"
              isDisabled={words.length === 0}
              onClick={onReadingModalOpen}
            >
              Light Reading
            </Button>
            <Button 
              variant="ghost"
              leftIcon={<FaDownload />}
              colorScheme="cyan"
              _hover={{ transform: 'translateY(-2px)' }}
              transition="all 0.2s"
              size="lg"
              isDisabled={words.length === 0 || isGeneratingAudio}
              onClick={handleGenerateAudio}
            >
              Download Audio
            </Button>
            <Button 
              variant="solid"
              colorScheme="green"
              leftIcon={<FaPlus />}
              _hover={{ transform: 'translateY(-2px)' }}
              transition="all 0.2s"
              size="lg"
              onClick={onOpen}
            >
              Add Word
            </Button>
          </Flex>
        </Flex>

        {isGeneratingAudio && (
          <Box my={4}>
              <Text color="cyan.300" mb={2}>{audioProgress.message}</Text>
              <Progress value={audioProgress.progress} colorScheme="cyan" hasStripe isAnimated />
          </Box>
        )}
    
        {finalAudioUrl && (
            <Box my={4}>
                <Button
                    as="a"
                    href={`${apiService.getBaseUrl()}${finalAudioUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    colorScheme="green"
                    leftIcon={<FaDownload />}
                >
                    Download Combined Audio Now
                </Button>
            </Box>
        )}

        <Box 
          bg="slate.800"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="slate.700"
          overflow="hidden"
          _hover={{ borderColor: 'slate.600' }}
          transition="all 0.2s"
        >
          {words.length === 0 ? (
            <Flex 
              direction="column" 
              align="center" 
              gap={4} 
              py={12}
              px={4}
            >
              <Icon 
                as={GiTreeBranch} 
                boxSize={12} 
                color="green.400" 
                style={{ animation: 'sparkle 3s ease infinite' }}
              />
              <Text color="gray.400" fontSize="lg" textAlign="center">
                Your tree is empty! Add some words to help it grow. 🌱
              </Text>
              <Button
                variant="outline"
                colorScheme="green"
                leftIcon={<FaPlus />}
                onClick={onOpen}
                size="lg"
                _hover={{ transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                Add Your First Word
              </Button>
            </Flex>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} p={4}>
              {words.map((word: Word, index: number) => (
                <MotionBox
                  key={word.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    x: 10,
                    backgroundColor: generateHoverColor(word.value),
                  }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.1,
                    type: "tween",
                    ease: "easeOut"
                  }}
                  onClick={() => navigate(`/words/${word.id}`)}
                  onMouseEnter={() => setSelectedWord(word.id)}
                  onMouseLeave={() => setSelectedWord(null)}
                  p={4}
                  borderRadius="lg"
                  bg={generateColor(word.value)}
                  position="relative"
                  cursor="pointer"
                >
                  <Flex justify="space-between" align="center">
                    <Box w="full">
                      <Text 
                        fontSize="xl" 
                        fontWeight="bold" 
                        color="white"
                        mb={2}
                      >
                        {word.value}
                      </Text>
                      
                      <Box mb={selectedWord === word.id ? 3 : 2}>
                        <ProgressIndicator 
                          learnedPoint={word.learnedPoint || 0} 
                          size="sm" 
                          showLabel={true}
                          showBadge={true}
                        />
                      </Box>
                      
                      {selectedWord === word.id && (
                        <Text 
                          color="gray.200" 
                          fontSize="md"
                          transition="all 0.3s"
                        >
                          {word.meaning}
                        </Text>
                      )}
                    </Box>
                    <Box>
                      <IconButton
                        aria-label="Delete word"
                        icon={<DeleteIcon />}
                        variant="ghost"
                        colorScheme="red"
                        opacity={selectedWord === word.id ? 1 : 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWord(word.id);
                        }}
                        _hover={{ transform: 'scale(1.1)' }}
                        transition="all 0.2s"
                      />
                    </Box>
                  </Flex>
                </MotionBox>
              ))}
            </SimpleGrid>
          )}
        </Box>

        <AddWordModal
          isOpen={isOpen}
          onClose={onClose}
          onAddWord={handleAddWord}
          listName={list?.name || ''}
        />

        <Modal isOpen={isReadingModalOpen} onClose={onReadingModalClose} size="md">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <Flex align="center" gap={2}>
                <FaBookOpen color="purple" />
                <Text color="purple.400">Generate Light Reading</Text>
              </Flex>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <Text fontSize="sm" color="gray.400">
                  Create a personalized reading passage using the words from "{list?.name}". 
                  Choose your preferred difficulty level:
                </Text>
                
                <FormControl>
                  <FormLabel color="purple.300">Reading Level</FormLabel>
                  <Select 
                    value={lightReadingLevel} 
                    onChange={(e) => setLightReadingLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                    bg="slate.700"
                    borderColor="slate.600"
                    _focus={{ borderColor: 'purple.400' }}
                  >
                    <option value="beginner">Beginner - Simple sentences and basic vocabulary</option>
                    <option value="intermediate">Intermediate - Natural flow with moderate complexity</option>
                    <option value="advanced">Advanced - Complex sentences and sophisticated language</option>
                  </Select>
                </FormControl>

                <Box p={3} bg="purple.50" borderRadius="md" borderLeft="4px solid" borderColor="purple.400">
                  <Text fontSize="sm" color="purple.700">
                    💡 The reading will include {Math.min(12, words.length)} randomly selected words from your list 
                    {words.length > 12 && ` (out of ${words.length} total)`} in a contextual story or article
                    {list?.context && ` related to "${list.context}"`}.
                  </Text>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onReadingModalClose}>
                Cancel
              </Button>
              <Button
                colorScheme="purple"
                onClick={handleGenerateLightReading}
                isLoading={generatingReading}
                loadingText="Creating Reading..."
                leftIcon={<FaBookOpen />}
              >
                Generate Reading
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </MotionBox>
    </Container>
  );
};